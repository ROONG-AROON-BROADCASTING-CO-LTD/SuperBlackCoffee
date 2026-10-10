package model

import "time"

type PromotionMenuItem struct {
	ID       int64   `json:"id"`
	Name     string  `json:"name"`
	Category string  `json:"category"`
	Price    float64 `json:"price"`
	ImageURL string  `json:"imageUrl"`
}

type PromotionBranch struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Code string `json:"code"`
}

type Promotion struct {
	ID          int64               `json:"id"`
	Name        string              `json:"name"`
	Type        string              `json:"type"`
	Benefit     string              `json:"benefit"`
	Status      string              `json:"status"`
	ImageURL    string              `json:"imageUrl"`
	Channels    []string            `json:"channels"`
	Eligibility string              `json:"eligibility"`
	StartsOn    *time.Time          `json:"startsOn"`
	EndsOn      *time.Time          `json:"endsOn"`
	Terms       []string            `json:"terms"`
	Usage       int64               `json:"usage"`
	Branches    []PromotionBranch   `json:"branches"`
	MenuItems   []PromotionMenuItem `json:"menuItems"`
}
