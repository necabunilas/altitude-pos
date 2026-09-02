# Software Development Agreement

**Silent Order: QR Dine-In Ordering Web Application**

This Software Development Agreement (the "Agreement") is entered into on **__________________ [date]**, by and between:

**Developer:** nicolausmagnus, represented by **__________________ [full legal name]**, of **__________________ [address]** ("the Developer"); and

**Client:** **__________________ [restaurant / cafe name]**, represented by its owner **__________________ [owner's full name]**, of **__________________ [city, province]** ("the Client").

The Developer and the Client are each a "Party" and together the "Parties."

---

## 1. Project Overview

The Developer has designed and developed a custom web application for the Client ("the System") that lets dine-in guests scan a QR code at their table to browse the menu, place food orders, call a waiter, request the bill, and leave feedback, with no waiter needed to take the order. Staff receive orders and requests in real time through a password-protected back office. The System is a mobile-friendly web app and covers one restaurant location.

## 2. Scope of Work / Deliverables

The Developer shall deliver the following:

**Guest-facing ordering (per table, via QR code)**
- A unique QR code for each table that opens that table's ordering page. No app install and no guest login are required.
- Menu browsing by category, with item names, descriptions, prices, and availability.
- Add-to-cart with quantities and per-order notes for the kitchen, and order placement.
- "Call waiter" and "Request bill" buttons that notify staff instantly.
- Star rating and comment feedback after the meal.

**Staff back office (password-protected)**
- Live order board that updates in near real time, with order status flow (placed, preparing, served, closed) and order cancellation.
- Waiter and bill request alerts, with a one-tap "resolve" action.
- Menu management: add, edit, and remove categories and items, update prices, and toggle item availability.
- Feedback inbox showing ratings and comments, with an average rating summary.

**In-app & terminal payment (card / QR Ph via Maya)**
- Integration with Maya (PayMaya) so a table's bill can be paid by card or QR Ph, with the order marked paid automatically on a successful payment.
- Integration with a Maya semi-integrated payment terminal so staff can accept card / QR Ph payments at the table, with the order settled automatically on success.
- Payment confirmation screens for both the guest and staff, and a "check payment status" action for staff to verify a payment.
- Delivered against Maya's sandbox environment; switching to live/production is done once the Client has an approved Maya merchant account. The physical terminal device and any acquirer, merchant, or transaction fees are provided and charged by Maya and are not part of the Developer's fee.

**BIR compliance readiness**
- A Sales Invoice receipt laid out to BIR's Ease of Paying Taxes (EOPT) format, with the Client's registered business header and VAT breakdown.
- System features that support registration of the System as a Computerized Accounting System (CAS): a non-resettable sequential invoice number series, an end-of-day (Z-reading) sales report, a tamper-evident audit trail, and an accumulating grand total.
- A CAS documentation pack (system description, process flow, sample invoice, and audit-trail notes) prepared for BIR submission.
- The Developer will assist with and coordinate the BIR CAS registration of the System, working with the Client and its accountant as needed, and does not charge the Client a separate fee for this coordination. Once the Acknowledgement Certificate, MIN, and invoice series are issued, the Developer prints those onto the receipt.

**Setup, data & delivery**
- Mobile-responsive design for guest phones and a staff tablet or laptop.
- A printable sheet of table QR codes generated from the System.
- Seeded starting menu and table set, adjustable by the Client.
- Cloud deployment (application hosting and cloud database).
- Source code delivered via a Git repository.

## 3. Out of Scope / Exclusions

The following are **not** included in this Agreement and, if requested, shall be quoted and billed separately:
- **The Client's own BIR obligations** (its business registration, tax filings, and books of accounts). The Developer handles the CAS registration of the System as described in Section 2; approval itself rests with the BIR and is not guaranteed.
- Payment provider fees, Maya merchant onboarding, and transaction/settlement charges.
- Sales, revenue, or accounting reports beyond the BIR-related reports listed in Section 2.
- Inventory or stock management.
- Kitchen printer or kitchen-display hardware integration.
- Multi-branch, franchise, or multi-restaurant management. The System covers one location.
- Customer accounts, loyalty programs, or SMS or email notifications.
- Native mobile app development for the App Store or Google Play. The System is a mobile-friendly web app.
- Professional photography or graphic design assets beyond those provided by the Client.
- New features, redesigns, or enhancements requested after acceptance.
- Ongoing maintenance and support beyond Section 7.

## 4. Running Costs (Client's Responsibility)

The Fee in Section 5 covers development only. The Client shall shoulder all recurring operating costs of the System, including but not limited to:
- Application hosting and cloud database subscriptions (beyond any free tiers, if upgraded).
- Domain name registration and renewal (if a custom domain is used).
- Printing of the table QR codes.

## 5. Fees & Payment Schedule

The total fee for the work described in Section 2 is **Sixty Thousand Pesos (₱60,000.00)**, payable as a **one-time payment** due on **__________________ [signing / delivery]**.

- Payment is made via **__________________ [GCash / bank transfer / cash]** to **__________________ [account details]**.
- If payment is more than **seven (7) days** late, the Developer may pause further development, updates, or support until it is settled.

*Optional add-ons, quoted separately if the Client wants them: sales and revenue reporting beyond the BIR reports, inventory management, and multi-branch support.*

## 6. Timeline & Acceptance

- Development start date: **__________________**.
- Target handover / go-live date: **__________________**.
- Upon delivery, the Client shall have **seven (7) days** to review and report any deliverable that does not meet Section 2. Absent a written report within that period, the deliverables are deemed accepted.

## 7. Support & Ongoing Assistance

- Bugs or defects in the delivered Scope of Work, reported within **thirty (30) days** of go-live, are fixed at no charge.
- **Even after handover, the Developer remains available to help** the Client run and operate the System. The Client is not left on their own.
- Any **new features, changes, or enhancements outside the Scope of Work** (Sections 2 to 3) will be discussed and given a **separate quote**, agreed by both parties before any work begins.

## 8. Intellectual Property & Handover

- Upon **full payment** of the ₱60,000.00, ownership of the custom source code and deliverables produced for the Client transfers to the Client. Prior to full payment, all rights remain with the Developer.
- "Handover" in practice means the Developer gives the Client **ownership of and/or access to the project accounts** (the code repository, the application hosting, and the database), together with the credentials and configuration needed to run the System, so that the Client, or any developer the Client engages in the future, has full access to everything.
- The Developer may continue to host and operate the System on the Client's behalf as agreed. Ongoing hosting and operation is covered by running costs (Section 4) and support (Section 7).
- Third-party components, libraries, frameworks, and services used in the System remain under their respective licenses. The Client's brand assets (logo, photos, name) remain the property of the Client.
- The Developer may reference the project (name and screenshots) in a portfolio, and a discreet "Powered by nicolausmagnus" credit may remain in the System.

## 9. Confidentiality

Both Parties will keep each other's non-public business, customer, and technical information private, and use it only for this project.

## 10. Good Faith

- The Developer builds the System with care and stands behind the work per the support terms in Section 7.
- The Developer is not responsible for problems caused by third-party services (hosting, database), lapsed subscriptions, or changes made outside the Developer's work.
- Since this is a good-faith arrangement between the Parties, any dispute will first be talked through and resolved reasonably between them. Should it ever come to it, the Developer's total liability is limited to the fees actually paid.

## 11. If Things Change

- Either Party may end the arrangement with reasonable written notice if the other is not holding up their end. The Client pays for the work done up to that point, and ownership transfers once any amounts due are settled.

## 12. General

- This Agreement reflects what the Parties have agreed. Any changes should be put in writing and agreed by both. It follows the laws of the Republic of the Philippines.

---

## Signatures

**Developer**

Signature: __________________________  Date: ______________

Name: nicolausmagnus / __________________ [full legal name]

<br />

**Client**

Signature: __________________________  Date: ______________

Name: __________________ [owner's full name], for __________________ [restaurant / cafe name]