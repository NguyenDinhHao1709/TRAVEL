// Chạy tự động xóa log cũ mỗi ngày lúc 2h sáng
const cron = require('node-cron');
const { exec } = require('child_process');

cron.schedule('0 2 * * *', () => {
  exec('node ./src/services/log-rotation.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Lỗi khi xóa log cũ: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(stdout);
  });
});

console.log('Đã bật lịch tự động xóa log cũ mỗi ngày lúc 2h sáng.');
