import { z } from "zod";

export const createDealSchema = z.object({
  account_name: z.string()
    .trim()
    .min(1, "Account name is required")
    .max(200, "Account name must be less than 200 characters"),
  deal_value: z.string()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Deal value must be a positive number"
    }),
  currency: z.string().min(1, "Currency is required"),
  stage: z.string().min(1, "Stage is required"),
  expected_close_month: z.date({
    required_error: "Expected close date is required"
  }),
  internal_notes: z.string().max(2000, "Notes must be less than 2000 characters").optional(),
});

export const addMeetingSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Meeting title is required")
    .max(200, "Title must be less than 200 characters"),
  meeting_date: z.string()
    .min(1, "Meeting date is required")
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate <= today;
    }, {
      message: "Meeting date cannot be in the future"
    }),
  channel: z.string().min(1, "Channel is required"),
  raw_notes: z.string()
    .trim()
    .min(10, "Notes must be at least 10 characters")
    .max(50000, "Notes must be less than 50,000 characters"),
});

export type CreateDealFormData = z.infer<typeof createDealSchema>;
export type AddMeetingFormData = z.infer<typeof addMeetingSchema>;
