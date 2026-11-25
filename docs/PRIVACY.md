# Dijitali Maths — Privacy & Data Protection Documentation

## 1. What Data Is Collected
- **Public Forms:** Name, email address, phone/WhatsApp number, county/organization, skills/availability (volunteers), and enquiry messages voluntarily submitted through Contact, Volunteer, Partner, Event Registration, and Newsletter forms.
- **Visitor Analytics (Privacy-First):** Page path, referrer domain (domain only, no full URL), device type (`mobile`, `tablet`, `desktop`), browser family, and date.
- **Admin Accounts:** Staff name, email, role, and bcrypt-hashed password.

## 2. How Data Is Protected
- **No Raw IP Addresses Stored:** Visitor IP addresses are never written to the database or logs. To estimate unique daily visitors, the server computes a one-way daily salted HMAC-SHA256 hash (`date + IP + User-Agent + ANALYTICS_SALT_SECRET`) and immediately discards the raw IP.
- **No Tracking Cookies:** Public visitor analytics use zero cookies and no third-party ad trackers.
- **Embedded YouTube Video:** The homepage loads its muted autoplay video from YouTube when opened, which connects visitors' browsers to YouTube and may disclose technical request data to that provider.
- **EXIF/GPS Stripping:** All uploaded photos are re-encoded with `sharp`, stripping EXIF and GPS location metadata before storage.
- **Donation Payments:** M-Pesa Express sends the donor's phone number and chosen amount to Safaricom to request payment. The site stores only the amount, payment result/receipt, and the phone number's last four digits.
- **Access Control:** Submissions and subscriber emails are accessible only to authenticated staff in `/admin`. CSV exports are restricted to the `admin` role.
- **Security Controls:** Passwords require at least 12 characters and are hashed with bcrypt (cost 12). Sessions use HttpOnly `SameSite=Lax` cookies with CSRF token verification and inactivity timeouts.

## 3. Handling a Data Deletion Request
1. Verify the identity of the requester via email (`dijitalimaths@gmail.com`) or phone (`+254 714 447 988`).
2. Sign in to `/admin` as an `admin` or `editor`.
3. Locate the person's record(s) in **Inbox** (Contact, Volunteers, Partners, Event Registrations) and/or **Subscribers** using the search bar.
4. Click **Delete** and confirm removal. The deletion is recorded in the **Audit Log** without retaining the deleted personal data.
5. Reply to the requester confirming their data has been removed.
