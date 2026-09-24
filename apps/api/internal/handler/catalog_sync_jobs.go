package handler

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"y/internal/cache"
)

const catalogSyncWorkers = 4
const catalogSyncMaxAttempts = 3

type catalogSyncBranch struct {
	BranchID   int64  `json:"branchId"`
	BranchName string `json:"branchName"`
	Status     string `json:"status"`
	Attempts   int    `json:"attempts"`
	Error      string `json:"error,omitempty"`
}

type catalogSyncJob struct {
	ID                int64               `json:"id"`
	TemplateID        int64               `json:"templateId"`
	Status            string              `json:"status"`
	TotalBranches     int                 `json:"totalBranches"`
	CompletedBranches int                 `json:"completedBranches"`
	FailedBranches    int                 `json:"failedBranches"`
	Branches          []catalogSyncBranch `json:"branches"`
}

func readCatalogSyncJob(ctx context.Context, db *sql.DB, templateID, jobID int64) (*catalogSyncJob, error) {
	job := &catalogSyncJob{Branches: []catalogSyncBranch{}}
	err := db.QueryRowContext(ctx, `
		SELECT j.id,j.template_id,j.status,j.total_branches,
			COUNT(b.branch_id) FILTER (WHERE b.status='completed'),
			COUNT(b.branch_id) FILTER (WHERE b.status='failed')
		FROM catalog_sync_jobs j
		LEFT JOIN catalog_sync_job_branches b ON b.job_id=j.id
		WHERE j.id=$1 AND j.template_id=$2
		GROUP BY j.id`, jobID, templateID).Scan(
		&job.ID, &job.TemplateID, &job.Status, &job.TotalBranches,
		&job.CompletedBranches, &job.FailedBranches)
	if err != nil {
		return nil, err
	}
	rows, err := db.QueryContext(ctx, `
		SELECT b.branch_id,branch.name,b.status,b.attempts,b.last_error
		FROM catalog_sync_job_branches b
		JOIN branches branch ON branch.id=b.branch_id
		WHERE b.job_id=$1 AND b.status='failed'
		ORDER BY branch.name,b.branch_id`, jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var branch catalogSyncBranch
		if err := rows.Scan(&branch.BranchID, &branch.BranchName, &branch.Status, &branch.Attempts, &branch.Error); err != nil {
			return nil, err
		}
		job.Branches = append(job.Branches, branch)
	}
	return job, rows.Err()
}

func parseCatalogSyncJobID(c *gin.Context) (int64, bool) {
	jobID, err := strconv.ParseInt(c.Param("jobId"), 10, 64)
	if err != nil || jobID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสงานซิงก์ไม่ถูกต้อง"})
		return 0, false
	}
	return jobID, true
}

func (h *PlatformHandler) GetCatalogSyncJob(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	templateID, ok := h.catalogTemplateID(c)
	if !ok {
		return
	}
	jobID, ok := parseCatalogSyncJobID(c)
	if !ok {
		return
	}
	job, err := readCatalogSyncJob(c.Request.Context(), h.db, templateID, jobID)
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบงานซิงก์"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านสถานะงานซิงก์ได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": job})
}

func (h *PlatformHandler) GetLatestCatalogSyncJob(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	templateID, ok := h.catalogTemplateID(c)
	if !ok {
		return
	}
	var jobID int64
	err := h.db.QueryRowContext(c.Request.Context(), `SELECT id FROM catalog_sync_jobs WHERE template_id=$1 ORDER BY id DESC LIMIT 1`, templateID).Scan(&jobID)
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": nil})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านสถานะงานซิงก์ได้"})
		return
	}
	job, err := readCatalogSyncJob(c.Request.Context(), h.db, templateID, jobID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านสถานะงานซิงก์ได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": job})
}

func (h *PlatformHandler) RetryCatalogSyncJob(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	templateID, ok := h.catalogTemplateID(c)
	if !ok {
		return
	}
	jobID, ok := parseCatalogSyncJobID(c)
	if !ok {
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเริ่มลองซิงก์ใหม่ได้"})
		return
	}
	defer tx.Rollback()
	var status string
	if err := tx.QueryRowContext(c.Request.Context(), `SELECT status FROM catalog_sync_jobs WHERE id=$1 AND template_id=$2 FOR UPDATE`, jobID, templateID).Scan(&status); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบงานซิงก์"})
		return
	}
	if status != "failed" && status != "partial_failed" {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "งานนี้ยังไม่มีสาขาที่ลองใหม่ได้"})
		return
	}
	var active bool
	if err := tx.QueryRowContext(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM catalog_sync_jobs WHERE template_id=$1 AND id<>$2 AND status IN ('pending','processing'))`, templateID, jobID).Scan(&active); err != nil || active {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "มีงานซิงก์อื่นกำลังทำงานอยู่"})
		return
	}
	if _, err := tx.ExecContext(c.Request.Context(), `
		UPDATE catalog_sync_job_branches
		SET status='pending',attempts=0,next_attempt_at=now(),lease_until=NULL,last_error=''
		WHERE job_id=$1 AND status='failed'`, jobID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถลองซิงก์ใหม่ได้"})
		return
	}
	if _, err := tx.ExecContext(c.Request.Context(), `UPDATE catalog_sync_jobs SET status='pending',finished_at=NULL WHERE id=$1`, jobID); err != nil || tx.Commit() != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถลองซิงก์ใหม่ได้"})
		return
	}
	job, err := readCatalogSyncJob(c.Request.Context(), h.db, templateID, jobID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านสถานะงานซิงก์ได้"})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"success": true, "data": job})
}

// RunCatalogSyncWorker claims a small number of independent branches at a time.
// PostgreSQL is the durable queue; multiple API instances can run this safely.
func RunCatalogSyncWorker(ctx context.Context, db *sql.DB, redisCache *cache.Client) {
	if db == nil {
		return
	}
	for range catalogSyncWorkers {
		go func() {
			ticker := time.NewTicker(time.Second)
			defer ticker.Stop()
			for {
				worked, err := ProcessCatalogSyncBranch(ctx, db, redisCache)
				if err != nil && ctx.Err() == nil {
					slog.Error("งานซิงก์ข้อมูลกลางผิดพลาด", "error", err)
				}
				if worked {
					continue
				}
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
				}
			}
		}()
	}
}

// ProcessCatalogSyncBranch performs one branch in its own transaction.
// Exporting this step makes the durable worker verifiable with the test database.
func ProcessCatalogSyncBranch(ctx context.Context, db *sql.DB, redisCache *cache.Client) (bool, error) {
	var jobID, branchID, templateID int64
	var attempts int
	err := db.QueryRowContext(ctx, `
		WITH candidate AS (
			SELECT item.job_id,item.branch_id
			FROM catalog_sync_job_branches item
			JOIN catalog_sync_jobs job ON job.id=item.job_id
			WHERE job.status IN ('pending','processing')
			  AND ((item.status='pending' AND item.next_attempt_at<=now())
			    OR (item.status='processing' AND item.lease_until<now()))
			ORDER BY job.created_at,item.branch_id
			FOR UPDATE OF item SKIP LOCKED LIMIT 1
		)
		UPDATE catalog_sync_job_branches item
		SET status='processing',attempts=item.attempts+1,lease_until=now()+interval '2 minutes'
		FROM candidate, catalog_sync_jobs job
		WHERE item.job_id=candidate.job_id AND item.branch_id=candidate.branch_id
		  AND job.id=item.job_id
		RETURNING item.job_id,item.branch_id,job.template_id,item.attempts`).Scan(&jobID, &branchID, &templateID, &attempts)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if _, err := db.ExecContext(ctx, `UPDATE catalog_sync_jobs SET status='processing',started_at=COALESCE(started_at,now()) WHERE id=$1 AND status='pending'`, jobID); err != nil {
		return true, err
	}
	branchCtx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()
	tx, err := db.BeginTx(branchCtx, nil)
	if err != nil {
		return true, failCatalogSyncBranch(ctx, db, redisCache, jobID, branchID, attempts, err)
	}
	defer tx.Rollback()
	var claimedStatus string
	var claimedAttempts int
	err = tx.QueryRowContext(branchCtx, `SELECT status,attempts FROM catalog_sync_job_branches WHERE job_id=$1 AND branch_id=$2 FOR UPDATE`, jobID, branchID).Scan(&claimedStatus, &claimedAttempts)
	if err != nil {
		_ = tx.Rollback()
		return true, failCatalogSyncBranch(ctx, db, redisCache, jobID, branchID, attempts, err)
	}
	if claimedStatus != "processing" || claimedAttempts != attempts {
		return true, nil
	}
	var assigned bool
	err = tx.QueryRowContext(branchCtx, `SELECT EXISTS(SELECT 1 FROM branch_catalog_template_assignments WHERE branch_id=$1 AND template_id=$2)`, branchID, templateID).Scan(&assigned)
	if err == nil && !assigned {
		err = fmt.Errorf("branch %d no longer uses template %d", branchID, templateID)
	}
	if err == nil {
		err = syncCatalogTemplateToBranchTx(branchCtx, tx, templateID, branchID)
	}
	if err == nil {
		_, err = tx.ExecContext(branchCtx, `INSERT INTO catalog_template_sync_events(template_id,branch_id,actor_id,reason)
			SELECT $1,$2,actor_id,'job' FROM catalog_sync_jobs WHERE id=$3`, templateID, branchID, jobID)
	}
	if err == nil {
		_, err = tx.ExecContext(branchCtx, `UPDATE catalog_sync_job_branches SET status='completed',lease_until=NULL,last_error='',completed_at=now()
			WHERE job_id=$1 AND branch_id=$2 AND attempts=$3`, jobID, branchID, attempts)
	}
	if err != nil {
		_ = tx.Rollback()
		return true, failCatalogSyncBranch(ctx, db, redisCache, jobID, branchID, attempts, err)
	}
	if err := tx.Commit(); err != nil {
		return true, failCatalogSyncBranch(ctx, db, redisCache, jobID, branchID, attempts, err)
	}
	invalidateCatalogSyncCache(ctx, redisCache, branchID)
	return true, refreshCatalogSyncJob(ctx, db, redisCache, jobID)
}

func failCatalogSyncBranch(ctx context.Context, db *sql.DB, redisCache *cache.Client, jobID, branchID int64, attempts int, cause error) error {
	slog.Warn("ซิงก์สาขาไม่สำเร็จ", "job_id", jobID, "branch_id", branchID, "attempt", attempts, "error", cause)
	status := "pending"
	if attempts >= catalogSyncMaxAttempts {
		status = "failed"
	}
	backoff := time.Duration(1<<min(attempts, 5)) * time.Second
	_, err := db.ExecContext(ctx, `UPDATE catalog_sync_job_branches SET status=$1,lease_until=NULL,
		next_attempt_at=now()+$2::interval,last_error='ซิงก์สาขานี้ไม่สำเร็จ'
		WHERE job_id=$3 AND branch_id=$4 AND status='processing' AND attempts=$5`, status, backoff.String(), jobID, branchID, attempts)
	if err != nil {
		return err
	}
	return refreshCatalogSyncJob(ctx, db, redisCache, jobID)
}

func refreshCatalogSyncJob(ctx context.Context, db *sql.DB, redisCache *cache.Client, jobID int64) error {
	var status string
	err := db.QueryRowContext(ctx, `
		UPDATE catalog_sync_jobs job SET status=CASE
			WHEN counts.remaining>0 THEN 'processing'
			WHEN counts.failed=0 THEN 'completed'
			WHEN counts.completed=0 THEN 'failed'
			ELSE 'partial_failed' END,
			finished_at=CASE WHEN counts.remaining=0 THEN now() ELSE NULL END
		FROM (SELECT job_id,
			COUNT(*) FILTER (WHERE status IN ('pending','processing')) remaining,
			COUNT(*) FILTER (WHERE status='failed') failed,
			COUNT(*) FILTER (WHERE status='completed') completed
			FROM catalog_sync_job_branches WHERE job_id=$1 GROUP BY job_id) counts
		WHERE job.id=counts.job_id
		RETURNING job.status`, jobID).Scan(&status)
	if err == nil && redisCache != nil && (status == "completed" || status == "partial_failed" || status == "failed") {
		redisCache.Delete(ctx, "sbc:dashboard:all")
		redisCache.DeletePattern(ctx, "sbc:report:daily:*:all")
		redisCache.DeletePattern(ctx, "sbc:menu-summary:*")
	}
	return err
}

func invalidateCatalogSyncCache(ctx context.Context, c *cache.Client, branchID int64) {
	if c == nil {
		return
	}
	c.Delete(ctx, fmt.Sprintf("sbc:inventory:%d", branchID), fmt.Sprintf("sbc:menu:%d", branchID),
		fmt.Sprintf("sbc:inventory:%d:ingredient", branchID),
		fmt.Sprintf("sbc:inventory:%d:stock", branchID),
		fmt.Sprintf("sbc:dashboard:%d", branchID))
	c.DeletePattern(ctx, fmt.Sprintf("sbc:inventory:%d:*", branchID))
	c.DeletePattern(ctx, fmt.Sprintf("sbc:menu:%d:*", branchID))
	c.DeletePattern(ctx, fmt.Sprintf("sbc:report:daily:*:%d", branchID))
}
