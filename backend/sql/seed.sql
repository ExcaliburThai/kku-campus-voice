USE kku_campus_voice;
-- หมวดหมู่ตัวอย่าง (รันซ้ำได้)
INSERT IGNORE INTO categories (name,icon) VALUES
 ('ถนนและทางเท้า','🛣️'),('ไฟฟ้าและแสงสว่าง','💡'),('อาคารและสถานที่','🏢'),
 ('การเรียนและสวัสดิการ','🎓'),('ความปลอดภัย','🛡️'),('สิ่งแวดล้อม','🌳'),
 ('อินเทอร์เน็ตและเทคโนโลยี','📶'),('อาหารและบริการ','🍱');
-- พื้นที่และพิกัดเป็นตัวอย่าง ยังไม่ตรวจสอบตำแหน่งจริง
INSERT INTO locations(name,kind,latitude,longitude)
SELECT v.name,v.kind,v.latitude,v.longitude FROM (
 SELECT 'คณะวิศวกรรมศาสตร์' name,'faculty' kind,16.4738 latitude,102.8202 longitude UNION ALL
 SELECT 'คณะวิทยาศาสตร์','faculty',16.4748,102.8252 UNION ALL
 SELECT 'คณะเกษตรศาสตร์','faculty',16.4757,102.8168 UNION ALL
 SELECT 'คณะแพทยศาสตร์','faculty',16.4684,102.8298 UNION ALL
 SELECT 'พื้นที่ส่วนกลาง','common',16.4740,102.8230 UNION ALL
 SELECT 'เขตหอพักนักศึกษา','dorm',16.4801,102.8225 UNION ALL
 SELECT 'ถนนภายในมหาวิทยาลัย','road',16.4770,102.8250
) AS v WHERE NOT EXISTS (SELECT 1 FROM locations l WHERE l.name=v.name);
-- ไม่สร้างเรื่องร้องเรียนปลอม สถิติเริ่มที่ 0
