package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestHeadquartersWorkdayRespectsConfiguredDayAndPublicHoliday(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	day := time.Date(2031, time.February, 3, 12, 0, 0, 0, time.UTC)
	isoDay := int(day.Weekday())
	if isoDay == 0 {
		isoDay = 7
	}
	var branchID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code,is_headquarters,work_days) VALUES('HQ workday test','HQ-WORKDAY-TEST',true,ARRAY[$1]::smallint[]) RETURNING id`, isoDay).Scan(&branchID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM public_holidays WHERE holiday_date=$1 AND name='HQ workday test holiday'`, day.Format("2006-01-02"))
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/", nil)
	h := &PlatformHandler{db: db}

	isWorkday, err := h.isHeadquartersWorkday(ctx, branchID, day)
	if err != nil || !isWorkday {
		t.Fatalf("configured day: workday=%t err=%v", isWorkday, err)
	}
	isWorkday, err = h.isHeadquartersWorkday(ctx, branchID, day.AddDate(0, 0, 1))
	if err != nil || isWorkday {
		t.Fatalf("unconfigured day: workday=%t err=%v", isWorkday, err)
	}
	if _, err := db.Exec(`INSERT INTO public_holidays(holiday_date,name) VALUES($1,'HQ workday test holiday')`, day.Format("2006-01-02")); err != nil {
		t.Fatal(err)
	}
	isWorkday, err = h.isHeadquartersWorkday(ctx, branchID, day)
	if err != nil || isWorkday {
		t.Fatalf("public holiday: workday=%t err=%v", isWorkday, err)
	}
}
