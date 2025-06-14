// ───── Nạp Google Charts ─────
google.charts.load("current", { packages: ["corechart"] });

// ───── Biến cấu hình Google Sheets ─────
const API_KEY = 'AIzaSyA1fRhQE_tbpwr0w7mc4kYWPWeGpN2I4-k';
const SHEET_ID_NAMES = '1bv0_DB47DF8YBiPJnTHw434H1RBQv3q88lPXNJmbGrk';
const SHEET_ID_HOURS = '1uIU21ZVrdAzC6SwvsYDrbRh5gL4aB2tsMIeUyJ5RvCs';
const RANGE_NAMES = 'Day 1!C5:C34';

// ───── Hàm fetch lương từ Google Sheets theo tháng ─────
// 📌 sheetId: ID file Sheets ứng với từng tháng
// 📌 sheetName: "Month 1", "Month 2", v.v...
// 📌 Lấy giá trị từ ô AM35 và hiển thị vào .salary
function fetchSalaryFromSheet(sheetId, sheetName) {
    const CELL = 'AM35';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!${CELL}?key=${API_KEY}`;

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            const value = data.values?.[0]?.[0] ?? "";

            // THAY ĐỔI Ở ĐÂY:
            // 1. Loại bỏ tất cả các ký tự không phải số (trừ dấu chấm thập phân cuối cùng nếu có)
            // Hoặc đơn giản hơn, loại bỏ tất cả dấu chấm và sau đó chuyển đổi
            let cleanedValue = value.toString().replace(/\./g, ''); // Loại bỏ tất cả dấu chấm (phân cách hàng nghìn)
            cleanedValue = cleanedValue.replace(',', '.'); // Đảm bảo dấu phẩy thập phân được chuyển thành dấu chấm

            const numeric = parseFloat(cleanedValue);

            if (!isNaN(numeric)) {
                // ✅ Nếu là số hợp lệ → hiển thị đẹp
                // Sử dụng toLocaleString() để định dạng lại số theo chuẩn VN (có dấu chấm phân cách hàng nghìn)
                document.querySelector('.salary').textContent = `${numeric.toLocaleString('vi-VN')} đ`;
            } else {
                // ❓ Nếu không phải số → giữ nguyên nội dung gốc hoặc hiện "Dữ Liệu?"
                document.querySelector('.salary').textContent = value || "Dữ Liệu?";
            }
        })
        .catch(error => {
            // ❌ Nếu lỗi API hoặc mạng → hiện chữ vui vẻ "Tohoho!"
            console.error('❌ Lỗi khi lấy dữ liệu Google Sheets:', error);
            document.querySelector('.salary').textContent = "Tohoho!";
        });
}



// ───── Hàm khởi động chính khi DOM sẵn sàng ─────
document.addEventListener("DOMContentLoaded", () => {
  initCalendarTop();
  setCalendarDateRange();
  setupMonthClickHandler();
  google.charts.setOnLoadCallback(drawChart);
});

// ───── Hàm tự động chọn tháng hiện tại khi mở web ─────
function autoSelectCurrentMonth() {
  const now = new Date();
  const currentMonthIndex = now.getMonth(); // 0–11
  const monthList = document.querySelectorAll('#monthList li');
  const monthName = monthList[currentMonthIndex].textContent;

  document.querySelector('#selectedMonth .month-text').textContent = monthName;

  const year = now.getFullYear();
  const start = `01/${currentMonthIndex + 1}/${year}`;
  const endDate = new Date(year, currentMonthIndex + 1, 0);
  const end = `${endDate.getDate()}/${currentMonthIndex + 1}/${year}`;

  document.getElementById('start-day').textContent = start;
  document.getElementById('end-day').textContent = end;

  // Gọi cập nhật lương khi mở web
  fetchSalaryFromSheet(SHEET_ID_HOURS, `Month ${currentMonthIndex + 1}`);
}


// ───── Hàm lấy dữ liệu từ Google Sheets ─────
async function fetchSheetData(sheetId, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.values || [];
}



// ───── Vẽ biểu đồ Google Chart (Chuẩn hóa + Khớp màu nhãn) ─────
async function drawChart() {
    const chartContainer = document.getElementById('chart_inner');
    chartContainer.innerHTML = '<div class="loading-text">Đang tải dữ liệu...</div>';

    try {
        const startDayText = document.getElementById("start-day").textContent;
        const monthNumber = parseInt(startDayText.split("/")[1]);
        const RANGE_HOURS_DYNAMIC = `Month ${monthNumber}!AJ5:AJ34`;

        const [namesRaw, hoursRaw] = await Promise.all([
            fetchSheetData(SHEET_ID_NAMES, RANGE_NAMES),
            fetchSheetData(SHEET_ID_HOURS, RANGE_HOURS_DYNAMIC)
        ]);

        const names = namesRaw.flat();
        const hours = hoursRaw.map(row =>
            row[0] !== undefined ? parseFloat(row[0].replace(',', '.')) : 0
        );
        const maxHour = Math.max(...hours, 1);

        const rawData = [['ID', 'Tên', 'Giờ làm', { role: 'annotation' }, { role: 'style' }]];
        const nameToColorMap = {};

        for (let i = 0; i < 30; i++) {
            const name = names[i]?.trim() || `Người ${i + 1}`;
            const hour = typeof hours[i] === 'number' && !isNaN(hours[i]) ? hours[i] : 0;

            const percent = (hour / maxHour) * 100;
            let color = '#c3aef1';
            if (percent >= 40) color = '#f8d936';
            if (percent >= 80) color = '#3bd7e5';

            nameToColorMap[name] = color;

            rawData.push([
                `ID ${i + 1}`,
                name,
                hour,
                hour.toString(),
                color
            ]);
        }

        const data = google.visualization.arrayToDataTable(rawData);
        const view = new google.visualization.DataView(data);
        view.setColumns([
            1, 2,
            { calc: "stringify", sourceColumn: 2, type: "string", role: "annotation" },
            4
        ]);

        const baseWidthPerPerson = 130;
        const width = Math.max(400, (rawData.length - 1) * baseWidthPerPerson);

        chartContainer.innerText = '';
        const chartDiv = document.createElement('div');
        chartDiv.style.minWidth = `${width}px`;
        chartDiv.style.height = '425px';
        chartContainer.appendChild(chartDiv);

        const options = {
            title: `Giờ làm mỗi người (Tháng ${monthNumber})`,
            titleTextStyle: {
                fontName: 'Baloo 2', fontSize: 24, fontWeight: 'bold', color: '#2c3e50'
            },
            width,
            height: 425,
            bar: { groupWidth: '65%' },
            legend: { position: 'none' },
            hAxis: {
                title: 'Tên nhân viên',
                textStyle: { fontName: 'Baloo', fontSize: 18, color: '#2c3e50', fontWeight: 'bold' },
                titleTextStyle: { fontName: 'Baloo', fontSize: 25, color: '#2c3e50', fontWeight: 'bold' }
            },
            vAxis: {
                title: 'Giờ làm',
                textStyle: { fontName: 'Baloo', fontSize: 20, color: '#2c3e50', fontWeight: 'bold' },
                titleTextStyle: { fontName: 'Baloo', fontSize: 20, color: '#2c3e50', fontWeight: 'bold' }
            },
            chartArea: { left: 75, top: 70, width: '95%', height: '65%' },
            annotations: {
                alwaysOutside: true,
                stem: { color: 'transparent' },
                textStyle: {
                    fontName: 'Baloo 2',
                    fontSize: 20,
                    bold: true,
                    color: '#000000'
                }
            },
            tooltip: { trigger: 'none' }
        };

        new google.visualization.ColumnChart(chartDiv).draw(view, options);
        setTimeout(() => { chartContainer.scrollLeft = 0; }, 100);

        // Lấy lương
        const sheetName = `Month ${monthNumber}`;
        if (!/^Month \d+$/.test(sheetName)) throw new Error("Tên sheet không hợp lệ!");
        fetchSalaryFromSheet(SHEET_ID_HOURS, sheetName);

        // Gán màu chính xác cho tên nhân viên dưới cột
        setTimeout(() => {
    const chartTexts = document.querySelectorAll('#chart_inner svg text');

    chartTexts.forEach(text => {
        const name = text.textContent.trim();

        const isLabel = (
            text.getAttribute('text-anchor') === 'middle' &&
            name !== '' &&
            !/^giờ làm|tên nhân viên|giờ làm mỗi người/i.test(name) &&
            text.getAttribute('fill')?.toLowerCase() !== '#000000'
        );

        if (isLabel) {
            text.setAttribute('font-size', '20');
            text.setAttribute('font-family', 'Baloo 2');
            text.setAttribute('font-weight', 'bold');
            // Không đổi màu fill để giữ nguyên màu bar (nếu có)
        }
    });

    chartContainer.scrollLeft = 0;
}, 500);


    } catch (err) {
        console.error('❌ Lỗi khi tải dữ liệu từ Sheets API:', err);
        chartContainer.innerText = 'Lỗi khi tải dữ liệu.';
    }
}

