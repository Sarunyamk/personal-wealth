# Personal Wealth Dashboard - Development Plan

เอกสารนี้แปลง SRS เป็นลำดับการพัฒนาแบบ frontend-first โดยตั้งใจเลื่อน Supabase,
database และ user account ไปช่วงท้าย หลังจาก UX และ business logic หลักผ่านการทดสอบแล้ว

## หลักการวางแผน

- ทำ vertical slice ที่เปิดใช้งานและตรวจสอบได้ในทุก phase
- ใช้ mock data และ local storage ก่อน แต่เข้าถึงข้อมูลผ่าน data service เดียว
- แยก calculation/domain logic ออกจาก DOM และ storage ตั้งแต่วันแรก
- Dashboard ต้องคำนวณจากข้อมูลจริงในแอป ไม่ hardcode ตัวเลขแยกกันหลายจุด
- Mobile-first และตรวจที่ 360, 768, 1024 และ 1440 px ทุก phase ที่มี UI
- Transactions, external price APIs และ insight engine ไม่อยู่ใน MVP รอบแรก
- DB/Auth เป็น phase ท้าย แต่ data model, IDs และ ownership fields ต้องเตรียมไว้ให้ย้ายได้

## MVP Definition of Done

ผู้ใช้ต้องทำสิ่งต่อไปนี้ได้ครบใน desktop และ mobile:

1. ดู Net Worth, Assets, Liabilities, Liquid Cash และการเปลี่ยนแปลงรายเดือน
2. เพิ่ม แก้ไข ค้นหา กรอง และปิดใช้งาน Asset/Liability
3. Quick update มูลค่า Asset และยอดหนี้ พร้อมสร้าง history อัตโนมัติ
4. ดู Net Worth trend, asset allocation และ debt progress
5. สร้าง Goal และเพิ่ม contribution
6. สร้าง/ดู monthly snapshot
7. เปิด Privacy Mode เพื่อซ่อนยอดเงิน
8. สมัครสมาชิก, login, logout และ reset password
9. ข้อมูลผู้ใช้ถูกแยกด้วย Supabase RLS และใช้งานบน GitHub Pages ได้

## Current Execution Plan

ทำงานส่วนที่เหลือตามลำดับนี้ ห้ามเริ่ม phase ถัดไปก่อน quality gate ของ phase ปัจจุบันผ่าน
หรือระบุ external blocker ไว้ชัดเจน

### Phase A - Supabase Stabilization

- [x] financial data ใช้ Supabase repository ใน production และไม่ fallback ไป localStorage
- [x] schema, constraints, ownership defaults, profile trigger และ RLS อยู่ใน migrations
- [x] Admin list ใช้ authenticated `admin_list_users` RPC
- [x] รัน migrations ทั้งหมดบน Supabase project ปัจจุบัน
- [x] reset migrations บน local Supabase project ว่าง
- [x] ทดสอบ direct request ด้วย User A/User B ว่าอ่านและแก้ข้อมูลข้ามบัญชีไม่ได้

### Phase B - Account Lifecycle

- [x] frontend ตรวจ disabled status ตอนเริ่มแอป ทุก 30 วินาที และเมื่อกลับเข้าแท็บ
- [x] disabled session แจ้งเตือนก่อน logout และแสดงเหตุผลที่หน้า login
- [x] Edge Function ป้องกัน self-management และ last-admin removal
- [x] deploy `admin-users` Edge Function เวอร์ชันล่าสุด
- [x] integration test local สำหรับ disable, ban, enable, delete และ data cascade
- [ ] ทดสอบ disable, enable และ delete ด้วยสองบัญชีบน hosted Supabase
- [x] ยืนยันว่า delete ลบข้อมูล user-owned ทุกตารางผ่าน cascade ด้วย local integration test

### Phase C - User Settings

- [x] แก้ display name และ base currency
- [x] เลือก theme และ privacy default ผ่าน design tokens
- [x] เปลี่ยนรหัสผ่านและ logout ทุกอุปกรณ์
- [x] แสดง email, role และ account status แบบ read-only
- [x] loading, validation, success และ error states พร้อม focused tests
- [x] integration test ยืนยันการบันทึก/อ่านกลับ profile settings และป้องกัน user แก้ role/status

### Phase D - Session and Security

- [x] ตั้ง local JWT expiry 1 ชั่วโมง, refresh-token rotation และ time-box 7 วัน
- [x] บังคับ hosted session อายุไม่เกิน 7 วันและ revoked-session denial ผ่าน RLS
- [x] ทดสอบ expired, revoked, banned และ offline behavior แบบ automated
- [ ] ตรวจ hosted Auth dashboard และทดสอบ logout/refresh ด้วย browser สองแท็บ
- [x] ตรวจ client bundle และ git history ว่าไม่มี secret/service-role key
- [x] ทำ security regression tests สำหรับ admin RPC, Edge Function และ RLS

### Phase E - Production Release

- [x] GitHub Pages workflow และ production environment variables
- [x] production Site URL/Redirect URLs สำหรับ GitHub Pages
- [ ] production smoke test: auth, wealth CRUD, monthly finance, goals, reports และ admin
- [ ] ตรวจ 360/768/1024/1440 px, console, overflow และ accessibility บน production
- [ ] อัปเดต setup, migration, deployment, recovery และ rollback documentation
- [ ] สร้าง MVP release tag หลังทุก quality gate ผ่าน

### Phase F - Post-MVP

- [ ] เริ่มได้หลัง Phase E เท่านั้น: portfolio pricing, multi-currency, insights และ notifications

## Phase 0 - Foundation and Decisions

เป้าหมาย: สร้างฐานโปรเจกต์ที่เปลี่ยน data source ภายหลังได้ง่าย

- [x] สร้างโครงสร้าง HTML/CSS/JavaScript ตาม SRS
- [x] กำหนด naming, module boundaries และ browser support
- [x] สร้าง design tokens: color, spacing, typography, radius, shadow, motion
- [x] สร้าง utilities สำหรับ currency, compact number, percent และ date
- [x] สร้าง domain calculators แบบ pure functions
  - `netWorth = totalAssets - totalLiabilities`
  - liquid assets
  - asset allocation
  - debt paid percentage
  - goal percentage
- [x] กำหนด data contracts สำหรับ asset, liability, history, goal และ snapshot
- [x] สร้าง seed data ที่ครอบคลุม happy path และ empty state
- [x] ตั้ง lint/format/test command ที่รันซ้ำได้

Exit criteria:

- โปรเจกต์เปิดใน local server ได้ ไม่มี console error
- calculation tests ผ่าน และ UI ไม่อ่าน mock JSON โดยตรง
- ทุก record ใช้ UUID-compatible ID และ date format ที่พร้อมส่ง Supabase

## Phase 1 - App Shell and Design System

เป้าหมาย: ได้โครงแอป responsive ที่นำ component ไปใช้ซ้ำได้

- [x] Desktop sidebar และ mobile bottom navigation
- [x] Header, page layout, cards, buttons, inputs, modal และ bottom sheet
- [x] Toast, loading, error, confirmation และ empty states
- [x] Icon system ด้วย Lucide
- [x] Privacy Mode state และรูปแบบ masked amount
- [x] Keyboard navigation, focus state, labels และ basic accessibility
- [x] Responsive shell ที่ 360/768/1024/1440 px

Exit criteria:

- ไปทุกหน้า MVP ได้ แม้หน้ายังเป็น placeholder
- component states หลักครบ: default, hover, focus, disabled, loading, error
- ไม่มี horizontal overflow หรือข้อความทับกันใน viewport เป้าหมาย

## Phase 2 - Local Data Layer

เป้าหมาย: ทำ data API ภายในให้หน้าจอใช้เหมือน backend จริง

- [x] สร้าง repository/service interface เช่น `listAssets`, `createAsset`, `updateAssetValue`
- [x] ทำ local-storage adapter พร้อม schema version
- [x] ทำ in-memory/mock adapter สำหรับ tests และ demos
- [x] validate และ normalize input ก่อนบันทึก
- [x] สร้าง event/activity records จาก mutation สำคัญ
- [x] เตรียม error contract กลางสำหรับ UI

Exit criteria:

- เปลี่ยน adapter ได้โดยไม่แก้ page/controller logic
- refresh browser แล้วข้อมูล local ยังอยู่
- invalid amount/date/category ไม่ถูกบันทึก

## Phase 3 - Assets and Liabilities

เป้าหมาย: ทำ workflow ข้อมูลหลักของ Net Worth ให้ครบก่อน Dashboard ขั้นเต็ม

- [x] Assets list, search และ category filter
- [x] Add/Edit/Deactivate Asset form
- [x] Quick Update Asset Value
- [x] Asset detail และ value history
- [x] Liabilities list, search และ debt type filter
- [x] Add/Edit/Deactivate Liability form
- [x] Quick Update Outstanding Balance
- [x] Liability detail, balance history และ debt progress
- [x] confirmation สำหรับ destructive actions

Exit criteria:

- CRUD และ quick update ใช้ได้จาก desktop/mobile
- ทุก quick update เพิ่ม history record และ activity record เพียงครั้งเดียว
- ค่า negative, NaN, invalid date และ duplicate submit ถูกจัดการ

## Phase 4 - Dashboard, Charts and Snapshots

เป้าหมาย: ตอบคำถามฐานะการเงินหลักภายในประมาณ 10 วินาที

- [x] Net Worth hero และ month-over-month change
- [x] Total Assets, Total Debt และ Liquid Cash summaries
- [x] Net Worth trend พร้อม 3M/6M/1Y/ALL
- [x] Asset allocation donut พร้อม tooltip ตัวเลขเต็ม
- [x] Goals preview และ recent activity
- [x] Financial Health indicator รุ่นแรก พร้อมแสดงองค์ประกอบที่คำนวณได้
- [x] Create/update monthly snapshot แบบ idempotent ต่อเดือน
- [x] Dashboard empty/partial/error/loading states

Exit criteria:

- ยอดทุกจุดตรงกับ calculators และข้อมูลใน Assets/Liabilities
- snapshot เดือนเดียวกันไม่เกิดซ้ำเมื่อกดซ้ำ
- chart ยังอ่านได้เมื่อมี 0, 1 และหลาย data points

หมายเหตุ: Emergency Fund และ Savings Rate ที่ต้องใช้ monthly expense ให้แสดงเป็น
`Not available` จนกว่าจะมี Transactions ใน post-MVP ห้ามสมมติค่าใช้จ่ายแทนผู้ใช้

## Phase 4.5 - Monthly Finance

เป้าหมาย: แทน spreadsheet รายเดือนด้วยข้อมูลที่แยกประเภทถูกต้องและปิดเดือนได้

- [x] Month selector และสถานะเดือน Draft/Closed
- [x] รายการ Income, Expense และ Transfer พร้อมหมวดหมู่
- [x] Budget plan เทียบ Actual โดย Actual คำนวณจากรายการเท่านั้น
- [x] Recurring items สำหรับรายการที่เกิดซ้ำทุกเดือน
- [x] Monthly cash flow, savings amount และ savings rate
- [x] Allocation summary แยกเงินออม/ลงทุนออกจากค่าใช้จ่าย
- [x] Reconciliation เทียบ closing cash กับยอด Asset ที่เลือก
- [x] Close/Reopen Month พร้อมสร้าง monthly snapshot แบบ idempotent
- [x] empty/loading/error states และ focused tests สำหรับ calculation/mutation

Exit criteria:

- Transfer ไม่ถูกนับเป็นรายจ่าย และไม่ทำให้ Net Worth ลดลง
- summary ทุกจุดคำนวณจากรายการต้นทาง ไม่มี total ที่กรอกซ้ำ
- ปิดเดือนเดิมซ้ำไม่สร้าง snapshot หรือ recurring records ซ้ำ

## Phase 4.6 - Annual Finance Report

เป้าหมาย: รวมภาพ 12 เดือนโดยรักษาความหมายของ flow และ point-in-time balance

- [x] สรุป Income, Expense, Savings และ Savings Rate รายเดือน/ทั้งปี
- [x] Opening/Closing Net Worth และการเติบโตทั้งปี
- [x] กราฟ cash flow, expense categories และ Net Worth trend
- [x] annual average และ month comparison
- [x] export CSV ที่นำกลับไปตรวจใน Excel/Google Sheets ได้
- [x] year/empty/partial/error states และ report calculation tests

Exit criteria:

- Net Worth รายปีใช้ Closing ลบ Opening และไม่รวมยอด Net Worth ของแต่ละเดือน
- flow totals รวมเฉพาะเดือนในปีที่เลือกและไม่รวม Transfer เป็น Income/Expense
- CSV totals ตรงกับหน้ารายงาน

## Phase 5 - Goals, Onboarding and UX Completion

เป้าหมาย: ทำ workflow รองและ first-use experience ให้ MVP สมบูรณ์

- [x] Goals list และ Add/Edit/Complete Goal
- [x] Goal contribution และ contribution history
- [x] Onboarding 3 ขั้นตอน พร้อม skip debt
- [x] Mobile Quick Add bottom sheet
- [x] Privacy Mode ครอบคลุมยอดเงิน, chart tooltip และ accessible text
- [x] page enter, modal, progress และ count-up animation แบบลด motion ได้
- [x] success/error feedback และ empty states ทุกหน้าหลัก

Exit criteria:

- ผู้ใช้ใหม่สร้าง asset แรกและเข้า Dashboard ได้โดยไม่ติดทางตัน
- Privacy Mode ไม่ทำข้อมูลจริงหลุดผ่าน tooltip หรือ aria-label
- `prefers-reduced-motion` ปิด motion ที่ไม่จำเป็นได้

## Phase 6 - Quality Gate Before Backend

เป้าหมาย: freeze พฤติกรรมของ frontend ก่อนผูกระบบจริง

- [x] Unit tests สำหรับ calculations, validators และ formatters
- [x] Integration tests สำหรับ quick update, history, snapshot และ goal contribution
- [x] End-to-end smoke flow บน desktop/mobile
- [x] ตรวจ accessibility, keyboard flow และ contrast
- [x] ตรวจ performance และลด render/chart work ที่ซ้ำ
- [x] ตรวจ test fixtures และ data contracts เทียบกับ schema ที่จะสร้าง

Exit criteria:

- ไม่มี critical/high bug ใน MVP flow
- automated tests ผ่านจาก clean checkout
- รายการ field และ constraint สำหรับ DB ถูกล็อกแล้ว

## Phase 7 - Supabase Database

เป้าหมาย: ย้าย persistence ไป PostgreSQL โดยไม่เปลี่ยน UX

- [x] สร้าง migrations สำหรับ profiles, categories, assets, liabilities, histories,
      goals, contributions และ snapshots
- [x] เพิ่ม PK/FK, checks, indexes, timestamps และ uniqueness constraints
- [x] seed master categories แบบ repeatable
- [x] ทำ trigger/function เฉพาะสิ่งที่ต้อง atomic เช่น updated timestamp
- [x] สร้าง Supabase adapter ให้ตรงกับ service interface เดิม
- [x] ทำ migration/import path จาก local data ถ้าต้องการเก็บข้อมูล prototype

Exit criteria:

- UI ใช้ Supabase adapter ได้โดย page code ไม่ต้องรู้ query details
- constraints ป้องกัน orphan history, invalid amounts และ duplicate monthly snapshot
- migration รันใหม่บน project ว่างได้

## Phase 8 - Authentication and RLS

เป้าหมาย: เพิ่ม account หลัง core app เสถียร และยืนยัน data isolation

- [x] Sign up, login, logout และ reset password
- [x] สร้าง profile เมื่อสมัคร และตั้ง THB เป็น default currency
- [x] auth guard และ session restore
- [x] เปิด RLS ทุก user-owned table
- [x] policies สำหรับ SELECT/INSERT/UPDATE/DELETE ด้วย `auth.uid()`
- [x] ตรวจ ownership ของ child records เช่น history และ goal contributions
- [ ] ทดสอบด้วยอย่างน้อย 2 users ว่าอ่าน/แก้ไขข้อมูลข้ามกันไม่ได้
- [x] จัดการ expired session, offline และ backend errors

Exit criteria:

- anonymous user เข้า private app data ไม่ได้
- User A ไม่สามารถอ่านหรือ mutate record ของ User B ผ่าน UI หรือ direct request
- service-role key ไม่อยู่ใน frontend หรือ repository

## Phase 8.5 - Administration and Account Lifecycle

เป้าหมาย: ให้ admin จัดการบัญชีโดยไม่เปิดเผย privileged key ใน frontend

- [x] เพิ่ม role/status ใน profile และป้องกัน user แก้สิทธิ์ตัวเอง
- [x] เพิ่ม restrictive RLS gate เพื่อบล็อกบัญชี disabled ทันที
- [x] เพิ่ม secure RPC สำหรับ list และ Edge Function สำหรับ disable/enable/delete user
- [x] ป้องกัน admin ปิดหรือลบบัญชีตัวเองและ admin คนสุดท้าย
- [x] สร้าง Admin UI พร้อม loading/empty/error/confirmation states
- [ ] deploy Edge Function และ promote admin คนแรก
- [ ] ทดสอบ disable/enable/delete และ data cascade ด้วย 2 users
- [ ] ตั้ง hosted Auth session time-box เป็น 7 วันและตรวจ refresh-token behavior

Exit criteria:

- service-role key อยู่เฉพาะ Supabase Edge Function
- disabled user อ่าน/เขียนข้อมูลไม่ได้แม้ access token เดิมยังไม่หมดอายุ
- delete user ลบข้อมูลที่อ้างถึง `auth.users` ผ่าน cascade ครบทุกตาราง

## Phase 9 - Release and Deployment

เป้าหมาย: ส่ง MVP ที่ deploy ซ้ำและตรวจสอบได้

- [x] ตั้ง Supabase URL/publishable key ผ่าน config ที่เหมาะกับ static hosting
- [x] กำหนด redirect/reset-password URLs สำหรับ GitHub Pages
- [x] ทำ production build/check และ deploy workflow
- [x] ตรวจ route, asset path, cache และ error handling บน GitHub Pages
- [ ] ทำ release smoke test ด้วย account ใหม่
- [ ] จัดทำ README: setup, local run, tests, migrations และ deploy

Exit criteria:

- URL production ใช้งาน flow หลักครบทั้ง mobile/desktop
- ไม่มี secret อยู่ใน git history หรือ client bundle
- มี rollback/redeploy procedure ที่ทำตามได้

## Post-MVP Roadmap

### Phase 10 - Transactions and Cash Flow

- Income, expense, transfer และ recurring transactions
- Monthly cash flow, savings rate และ expense breakdown
- Emergency fund months จาก liquid assets / monthly expenses
- Reports สำหรับ income, expense และ savings

### Phase 11 - Portfolio and Auto Valuation

- Investment portfolio และราคาหุ้น/กองทุน/ทอง/คริปโต
- currency conversion และ asset auto valuation
- ต้องออกแบบ provider limits, cache, stale state และ fallback ก่อนเริ่ม

### Phase 12 - Insights and Wealth Timeline

- rule-based financial insights โดยไม่ให้คำแนะนำการลงทุน
- milestones, wealth timeline และ notification preferences
- อธิบายสูตร/ที่มาของ insight ให้ผู้ใช้ตรวจสอบได้

## Recommended Milestones

| Milestone               | Included phases | Demo outcome                               |
| ----------------------- | --------------- | ------------------------------------------ |
| M1: Clickable Prototype | 0-1             | Shell และ UI states ใช้งานได้ทุก viewport  |
| M2: Local MVP Core      | 2-3             | จัดการ assets/liabilities และ history ได้  |
| M3: Complete Local MVP  | 4-6             | Dashboard, monthly finance, goals และ tests ครบ |
| M4: Secure Cloud MVP    | 7-8             | Supabase persistence, auth และ RLS ผ่าน    |
| M5: Production Release  | 9               | Deploy และ smoke test บน GitHub Pages      |

## Scope Guardrails

- Transactions รายเดือนเป็น MVP ตาม Phase 4.5; external price feeds ยังรอหลัง M4
- ห้ามผูก page เข้ากับ Supabase client โดยตรง ให้ผ่าน service/repository เสมอ
- ห้ามคำนวณยอดด้วย formatted strings ให้ใช้ numeric values แล้ว format ตอนแสดงผล
- ห้ามใช้ delete จริงเป็นค่าเริ่มต้นสำหรับ financial records ให้ใช้ deactivate/archive
- ห้ามนับ chart animation หรือสีเป็นตัวแทนของ accessibility
- ทุก feature ต้องมี empty, loading, error และ partial-data behavior ที่กำหนดไว้
