/**
 * ตั้งค่าการเชื่อมต่อ Google Sheet
 * --------------------------------
 * SCRIPT_URL : URL ของเว็บแอป Google Apps Script (ลงท้ายด้วย /exec) — ดูขั้นตอนใน README.md
 *              ถ้าเว้นว่างไว้ ระบบจะบันทึกข้อมูลไว้ในเบราว์เซอร์ของเครื่องนั้นแทน
 * SHEET_URL  : (ไม่บังคับ) ลิงก์ของ Google Sheet เพื่อแสดงปุ่ม "เปิด Google Sheet" ในเมนูส่งออก
 * POLL_SECONDS : ดึงข้อมูลล่าสุดจากชีตทุกกี่วินาที (ให้ทุกเครื่องเห็นข้อมูลตรงกัน)
 */
window.APP_CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyWaU_mwzWBbfumfFk7XygzU5FKSSYKDKRrwl9_OXqhSOLQwjlqpI5OB9pE0qSFnLmuag/exec",
  SHEET_URL: "https://docs.google.com/spreadsheets/d/19h2fRrspEQd4PwUpMaust5Z8337xhia9GJdpeWu90kA/edit",
  POLL_SECONDS: 15
};
