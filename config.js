/**
 * ตั้งค่าการเชื่อมต่อ Google Sheet
 * --------------------------------
 * SCRIPT_URL : URL ของเว็บแอป Google Apps Script (ลงท้ายด้วย /exec) — ดูขั้นตอนใน README.md
 *              ถ้าเว้นว่างไว้ ระบบจะบันทึกข้อมูลไว้ในเบราว์เซอร์ของเครื่องนั้นแทน
 * SHEET_URL  : (ไม่บังคับ) ลิงก์ของ Google Sheet เพื่อแสดงปุ่ม "เปิด Google Sheet" ในเมนูส่งออก
 * POLL_SECONDS : ดึงข้อมูลล่าสุดจากชีตทุกกี่วินาที (ให้ทุกเครื่องเห็นข้อมูลตรงกัน)
 */
window.APP_CONFIG = {
  SCRIPT_URL: "",
  SHEET_URL: "",
  POLL_SECONDS: 15
};
