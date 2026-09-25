package dto

type ExpenseRequest struct {
	BranchID        *int64  `json:"branchId"`
	Title           string  `json:"title" binding:"required,max=160"`
	Category        string  `json:"category" binding:"required,oneof=maintenance office transport service other"`
	EstimatedAmount float64 `json:"estimatedAmount" binding:"required,gt=0"`
	Note            string  `json:"note" binding:"max=2000"`
}

type ExpenseRequestStatus struct {
	Status string `json:"status" binding:"required,oneof=approved funded purchasing awaiting_documents completed rejected"`
}
