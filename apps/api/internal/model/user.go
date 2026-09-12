package model

type User struct {
	ID                     uint   `json:"id" gorm:"primaryKey"`
	Name                   string `json:"name"`
	Username               string `json:"username"`
	Email                  string `json:"email"`
	PasswordHash           string `json:"-"`
	Role                   string `json:"role"`
	FranchiseeID           *int64 `json:"franchiseeId,omitempty"`
	BranchID               *int64 `json:"branchId,omitempty"`
	DefaultStartsAt        string `json:"defaultStartsAt,omitempty"`
	DefaultEndsAt          string `json:"defaultEndsAt,omitempty"`
	DefaultSecondStartsAt  string `json:"defaultSecondStartsAt,omitempty"`
	DefaultSecondEndsAt    string `json:"defaultSecondEndsAt,omitempty"`
	DefaultSecondShiftDays []int  `json:"defaultSecondShiftDays,omitempty"`
}
