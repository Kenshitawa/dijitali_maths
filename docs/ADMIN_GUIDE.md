# Dijitali Maths — Staff Admin Guide

Welcome to the Dijitali Maths Admin Portal (`/admin`). This guide is written for non-technical staff.

## 1. Logging In
1. Go to `https://dijitalimaths.com/admin` (or `http://localhost:3000/admin` locally).
2. Enter your email address and password.
3. If you forget your password, click **Forgot password?** to receive a one-time reset link.
4. For security, sessions automatically sign out after 10 minutes without activity.

## 2. Reading Messages & Submissions (Inbox)
- Open **Inbox** from the left menu.
- Switch between tabs: **Contact**, **Volunteers**, **Partners**, and **Event Registrations**.
- Use the search box or status filter (`new`, `read`, `replied`, `archived`).
- Click **Reply** to open your email app pre-addressed to the sender.
- Update the status or add internal notes and click **Save**.
- Admins can click **Export CSV** to download a spreadsheet.

## 3. Uploading & Managing Photos
- Open **Images** from the left menu.
- Select a category (`Learners`, `Teachers`, `Community`, `Maths in Action`, or `Partners`) and optionally type a caption.
- Drag and drop JPEG, PNG, or WebP photos into the upload box (up to 20 files at once, 10 MB each).
- Photos are automatically resized, stripped of GPS/EXIF metadata, and converted to fast WebP format.
- Click **Edit** on any photo to change its title, caption/alt text, category, display order, or published status.
- Use the checkboxes and **Delete Selected** to remove multiple photos at once.

## 4. Editing Programs, Events, Posts & Videos
- Open **Programs**, **Events**, **Posts**, or **Videos** from the left menu.
- Click **Add** / **New** to create an item, or **Delete** to remove one (a confirmation prompt will appear).
- Set status to `draft` while preparing content, and `published` when ready for the public website.
- In **Videos**, paste a YouTube URL or upload an MP4/WebM file. Uploads are stored in `uploads/videos` (100 MB default limit); published uploads play on the public Videos page. The upload progress bar shows the transfer percentage.
- Image uploads show their transfer percentage too; other admin changes display a saving indicator.

## 5. Managing Newsletter Subscribers
- Open **Subscribers** to view and search email subscribers.
- Admins can export the list to CSV. Editors and admins can unsubscribe or remove an address upon request.

## 6. Inviting & Managing Team Users (Admins Only)
- Open **Users** and click **Invite User**.
- Enter the person's name, email, and role:
  - **Admin**: Full access (users, settings, CSV exports, audit log, content).
  - **Editor**: Manage images, programs, events, posts, videos, and inbox.
  - **Viewer**: Read-only access to inbox, subscribers, and visitor analytics.
- If email (SMTP) is not configured, copy the one-time setup link shown on screen and send it to the user privately.

## 7. Updating Payment & Contact Details
- Open **Site Settings** to update suggested donation amounts (comma-separated KES values), M-Pesa Paybill/account name, Equity Bank details, contact email, or phone number. Every change is recorded in the change history and updates the public donation page.
- M-Pesa Express requires Daraja credentials and a public HTTPS callback URL in the server environment. Configure `MPESA_ENVIRONMENT`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`, and `MPESA_CALLBACK_TOKEN`; keep credentials out of Site Settings. The callback URL must end in `/api/donations/mpesa/callback?token=<same-token>`. Site Settings shows whether STK Push is configured and the latest payment statuses.
