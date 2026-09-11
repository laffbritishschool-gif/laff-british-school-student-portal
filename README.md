# Laff British Montessori School — Student Portal

A branded student-portal frontend for Laff British Montessori School.

## Included pages
- Dashboard
- Student Login
- My Profile
- Results
- Attendance
- Timetable
- Announcements / Notifications
- Fees & Payments
- Digital Student ID Card

Assignments are intentionally excluded for now.

## Design
- Official school crest/logo
- Blue and yellow school branding
- Responsive desktop/mobile layout
- Collapsible sidebar on desktop and mobile
- Animated cards, hover states and notification feedback
- Realistic school portal sample data
- Digital ID card preview

## Production integration
This repository currently contains the polished frontend foundation with demonstration data. The next integration layer should connect the UI to Supabase Auth/Postgres/RLS. Student records must be derived from the authenticated user's identity. Privileged account creation and payment verification must remain server-side.

Never put Supabase service-role keys or other server secrets in browser code.
