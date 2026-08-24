# Agent Working Agreement

อ่าน `PLAN.md` และ SRS ก่อนเริ่มงาน แล้วทำตาม phase ตามลำดับ เว้นแต่ผู้ใช้ระบุให้
เปลี่ยนลำดับอย่างชัดเจน

## Current Strategy

- พัฒนา frontend ด้วย mock/local data ให้ครบผ่าน Phase 6 ก่อนเริ่ม Supabase
- เก็บ database และ authentication ไว้ Phase 7-8
- เข้าถึงข้อมูลผ่าน repository/service interface เท่านั้น
- แยก pure calculation/validation/formatting logic ออกจาก DOM และ storage
- ใช้ Vanilla JavaScript, HTML5, CSS3, Chart.js และ Lucide ตาม SRS
- ทำ mobile-first และตรวจ 360, 768, 1024 และ 1440 px

## Definition of Done Per Task

- implementation ครบทั้ง success, empty, loading และ error state ที่เกี่ยวข้อง
- ไม่มี console error และไม่มี horizontal overflow ใน viewport เป้าหมาย
- calculation หรือ data mutation ที่เพิ่มใหม่มี focused tests
- รัน tests/lint ที่มีอยู่และรายงานสิ่งที่ยังไม่ได้ตรวจ
- อัปเดต checkbox ใน `PLAN.md` เฉพาะรายการที่เสร็จและตรวจแล้ว

## Boundaries

- อย่าเริ่ม feature จาก Post-MVP โดยไม่ได้รับคำสั่ง
- อย่า hardcode summary totals แยกจาก source records
- อย่าเก็บ Supabase service-role key ใน frontend
- อย่าปิดหรือข้าม RLS เพื่อให้ feature ผ่าน
- อย่าลบ financial record ถาวรโดยไม่มี requirement; ใช้ archive/deactivate
- รักษาการแก้ไขที่ผู้ใช้มีอยู่และหลีกเลี่ยง refactor นอก scope

