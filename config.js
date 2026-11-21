/**
 * ตั้งค่าการเชื่อมต่อ Supabase (ฐานข้อมูล + ระบบล็อกอิน)
 * ------------------------------------------------------
 * SUPABASE_URL : Project URL ของ Supabase
 * SUPABASE_KEY : Publishable key (ปลอดภัยที่จะเปิดเผยในหน้าเว็บ — ข้อมูลถูกป้องกันด้วย Row Level Security
 *                ให้เฉพาะบัญชีแอดมินในตาราง public.admins อ่าน/เขียนได้)
 *                ห้ามใส่ secret key / service_role key ในไฟล์นี้เด็ดขาด
 * POLL_SECONDS : ดึงข้อมูลล่าสุดซ้ำทุกกี่วินาที (สำรอง เผื่อ Realtime หลุด)
 */
window.APP_CONFIG = {
  SUPABASE_URL: "https://ralmsrokevjscxvdztfy.supabase.co",
  SUPABASE_KEY: "sb_publishable_T5AZAV3h9Vyt1uH3Y8HJ2Q_5V3ha4vA",
  POLL_SECONDS: 30
};
