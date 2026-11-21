# เช็คชื่อคลาส Clude AI

🌐 **เว็บไซต์:** https://bestnmk24-cyber.github.io/CludeAI_Check_in/  ·  เวอร์ชันปัจจุบัน **v2.0.0** (ดู [CHANGELOG.md](CHANGELOG.md))

เว็บเช็คชื่อผู้เข้าเรียนแบบออนไลน์ ธีมน้ำเงินกับมาสคอต “น้องเหมียว” ใช้ได้บนคอมพิวเตอร์ แท็บเล็ต และมือถือ
ใช้ **Supabase** เป็นทั้งฐานข้อมูลและระบบล็อกอิน (เข้าสู่ระบบด้วย Google / Gmail) — ใช้งานได้เฉพาะบัญชีแอดมิน

## ความสามารถ

- 🔐 หน้าเข้าสู่ระบบด้วย Google (หรือรับลิงก์ทางอีเมล) — อนุญาตเฉพาะอีเมลในตาราง `admins`
- ✅ เช็คอิน / เซ็นชื่อบนหน้าจอ / เช็คเอาท์ พร้อมคำนวณเวลาเรียนรวม
- ⏰ ตั้งเวลาเริ่มคลาส แล้วระบบแสดงสถานะ **มาสาย** ให้อัตโนมัติ
- ⚡ ทุกเครื่องเห็นข้อมูลตรงกันทันที (Supabase Realtime) และทำงานต่อได้เมื่ออินเทอร์เน็ตหลุด
- 👥 รายชื่อพร้อมบริษัท/ตำแหน่ง ค้นหา กรองสถานะ นำเข้าจาก CSV / Excel
- 📤 ส่งออก Excel / CSV หรือคัดลอกไปวางใน Google Sheets · ดูข้อมูลย้อนหลังตามวันที่

## โครงสร้างไฟล์

```
CludeAI_Check_in/
├── index.html              หน้าเว็บ (ไฟล์เดียว รวม HTML/CSS/JS)
├── config.js               URL และ publishable key ของ Supabase
├── supabase/schema.sql     โครงสร้างฐานข้อมูล + สิทธิ์ (RLS) ทั้งหมด
├── CHANGELOG.md            ประวัติเวอร์ชัน
├── roster-template.csv     ตัวอย่างไฟล์รายชื่อสำหรับนำเข้า
├── sample-roster.csv       รายชื่อตัวอย่าง (ข้อมูลสมมติ)
└── legacy/google-sheets/   ระบบเดิม (v1.x) ที่บันทึกลง Google Sheet — ไม่ได้ใช้แล้ว
```

## ฐานข้อมูล (Supabase)

| ตาราง | เก็บอะไร |
|---|---|
| `admins` | อีเมลที่ล็อกอินได้ (ตอนนี้: bestnmk24@gmail.com) |
| `students` | รายชื่อผู้เรียน ชื่อ รหัส บริษัท ตำแหน่ง ลำดับ |
| `attendance` | 1 แถว / คน / วัน — เวลาเข้า เวลาออก ลายเซ็น (PNG) ผู้บันทึก |
| `class_settings` | ชื่อคลาส เวลาเริ่มเรียน และกี่นาทีถึงนับว่ามาสาย |

- ทุกตารางเปิด **Row Level Security** — อ่าน/เขียนได้เฉพาะผู้ที่ล็อกอินด้วยอีเมลในตาราง `admins`
- มี trigger กันไม่ให้อีเมลอื่นสร้างบัญชีได้ แม้จะกดล็อกอินด้วย Google
- **เพิ่มแอดมินคนใหม่:** Supabase → SQL Editor → `insert into public.admins (email) values ('ชื่อ@gmail.com');`

## ตั้งค่า (ทำครั้งเดียว)

1. **ฐานข้อมูล** — รัน `supabase/schema.sql` ใน SQL Editor (โปรเจกต์ปัจจุบันตั้งไว้แล้ว)
2. **URL ที่อนุญาต** — Supabase → Authentication → URL Configuration
   - Site URL: `https://bestnmk24-cyber.github.io/CludeAI_Check_in/`
   - Redirect URLs: `https://bestnmk24-cyber.github.io/CludeAI_Check_in/**`
3. **ล็อกอินด้วย Google**
   1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → *Web application*
   2. Authorized JavaScript origins: `https://bestnmk24-cyber.github.io`
   3. Authorized redirect URI: `https://ralmsrokevjscxvdztfy.supabase.co/auth/v1/callback`
   4. นำ Client ID / Client secret ไปใส่ที่ Supabase → Authentication → Sign In / Providers → **Google** → Enable
4. **config.js** — ใส่ `SUPABASE_URL` และ `SUPABASE_KEY` (publishable key) — ตั้งไว้แล้ว
   > ⚠️ ห้ามใส่ secret / service_role key ใน `config.js` เด็ดขาด

## นำขึ้น GitHub Pages

push ขึ้น branch `main` แล้วเปิด **Settings → Pages → Deploy from a branch → `main` / `(root)`**

## ข้อควรรู้

- ใช้งานแบบ “เครื่องหน้าห้อง”: แอดมินล็อกอินบนแท็บเล็ต/คอม แล้วให้ผู้เรียนมาเช็คอินและเซ็นชื่อที่เครื่องนั้น
- publishable key ใน `config.js` เปิดเผยได้ เพราะข้อมูลทั้งหมดถูกป้องกันด้วย RLS
- อย่า commit รายชื่อจริงของผู้เรียนลง repo สาธารณะ (`.gitignore` กันไฟล์ `*roster*.csv` และ `*.xlsx` ไว้ให้)

## แก้ปัญหาเบื้องต้น

| อาการ | วิธีแก้ |
|---|---|
| กดล็อกอินด้วย Google แล้วขึ้นหน้า error `provider is not enabled` | ยังไม่ได้เปิด Google provider ใน Supabase (ข้อ 3) |
| ล็อกอินแล้วเด้งไป `localhost` | ตั้ง Site URL / Redirect URLs (ข้อ 2) |
| ขึ้น “บัญชีนี้ไม่ได้รับอนุญาต” | อีเมลนั้นไม่อยู่ในตาราง `admins` |
| ขึ้น “ออฟไลน์ · รอส่ง n รายการ” | ข้อมูลยังอยู่ในเครื่อง จะส่งเข้าฐานข้อมูลเองเมื่ออินเทอร์เน็ตกลับมา |
