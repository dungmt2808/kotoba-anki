/* Bản mẫu thiết kế độc lập. Không tải mã sản phẩm, gọi Anki hay Gemini. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var screen = new URLSearchParams(location.search).get('screen') || 'garden';
  if (['garden', 'shop', 'journal', 'reading'].indexOf(screen) < 0) screen = 'garden';
  $(screen).hidden = false;
  document.querySelector('[data-screen="' + screen + '"]').classList.add('selected');
  document.querySelector('[data-screen="' + screen + '"]').setAttribute('aria-current', 'page');
  var toastTimer;
  function tell(message) {
    var box = document.querySelector('.toast');
    box.textContent = message; box.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { box.hidden = true; }, 6000);
  }
  document.querySelectorAll('[data-demo]').forEach(function (button) {
    button.addEventListener('click', function () { tell(button.dataset.demo); });
  });
  var items = [
    {name:'Đèn lồng giấy',kind:'lantern',price:70,owned:0,placed:0,description:'Sáng đèn ban đêm.'},
    {name:'Ghế gỗ',kind:'bench',price:90,owned:1,placed:1,description:'Chim sẻ thỉnh thoảng ghé đậu.'},
    {name:'Hòm thư',kind:'mailbox',price:60,owned:1,placed:1,description:'Cờ dựng khi có báo mới.'},
    {name:'Bụi hoa',kind:'flowers',price:25,owned:2,placed:1,description:'Hoa rung rinh trong gió.'},
    {name:'Hàng rào gỗ',kind:'fence',price:15,owned:0,placed:0,description:'Trang trí quanh sân vườn.'},
    {name:'Bù nhìn',kind:'scarecrow',price:100,owned:0,placed:0,description:'Đung đưa trong vườn.'}
  ];
  var selectedItem = items[0];
  function clean(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d'); }
  function renderItems() {
    var grid = $('product-grid'); grid.textContent = '';
    var query = clean($('item-search').value), filter = $('item-filter').value;
    var filtered = items.filter(function (item) { return clean(item.name).indexOf(query) >= 0 && (filter !== 'owned' || item.owned > 0) && (filter !== 'affordable' || item.price <= 1280); });
    document.querySelector('.result-count').textContent = filtered.length + ' món minh họa · Sân vườn';
    filtered.forEach(function (item) {
      var button = document.createElement('button'); button.className = 'product-card' + (item === selectedItem ? ' selected' : '');
      button.setAttribute('aria-pressed', String(item === selectedItem));
      var sprite = document.createElement('i'); sprite.className = 'sprite ' + item.kind; sprite.setAttribute('aria-hidden','true'); button.appendChild(sprite);
      [['item-title',item.name],['item-price',item.price + ' xu'],['item-state',item.owned ? 'Có ' + item.owned + ' · Đã đặt ' + item.placed : 'Chưa sở hữu']].forEach(function (part) { var span = document.createElement('span'); span.className = part[0]; span.textContent = part[1]; button.appendChild(span); });
      button.addEventListener('click', function () { selectedItem = item; selectItem(item); renderItems(); }); grid.appendChild(button);
    });
    if (!filtered.length) { var empty = document.createElement('p'); empty.textContent = 'Không có món phù hợp. Thử bỏ bộ lọc.'; grid.appendChild(empty); }
  }
  function selectItem(item) {
    $('item-name').textContent = item.name; $('item-description').textContent = item.description;
    $('item-owned').textContent = item.owned ? 'Có ' + item.owned + ' · Đã đặt ' + item.placed : 'Chưa sở hữu';
    $('item-price').textContent = item.price + ' xu'; $('item-after').textContent = 'Sau mua: ' + (1280 - item.price).toLocaleString('vi-VN') + ' xu';
    $('item-buy').textContent = item.owned > item.placed ? 'Đặt từ kho' : 'Mua & đặt';
  }
  $('item-search').addEventListener('input',renderItems); $('item-filter').addEventListener('change',renderItems); renderItems();
  var chosenDate = 13;
  function drawMonth() {
    var grid = $('calendar-grid'); grid.textContent = '';
    for (var blank = 0; blank < 6; blank++) { var spacer = document.createElement('div'); spacer.className = 'calendar-day empty'; grid.appendChild(spacer); }
    for (var d = 1; d <= 30; d++) {
      (function (date) {
        var button = document.createElement('button'); button.className = 'calendar-day' + (date === 13 ? ' is-today' : '') + (date === chosenDate ? ' is-selected' : '') + (date > 13 ? ' future' : '');
        button.setAttribute('aria-label',date + '/11/2026' + (date === 13 ? ', hôm nay' : '')); button.setAttribute('aria-pressed',String(date === chosenDate));
        var num = document.createElement('span'); num.textContent = String(date); button.appendChild(num);
        if (date < 14 && [1,4,8,10].indexOf(date) < 0) {
          var plant = document.createElement('canvas'); plant.className = 'mini-plant'; plant.width = 16; plant.height = 18; plant.setAttribute('aria-hidden','true');
          // Cùng cách vẽ và bảng màu với garden.js; chỉ minh họa cây trong lịch.
          var rows = ['.....kkkkkk.....','....kggggggk....','...kggrgggggk...','..kggrrggggGGk..','..kgggggrgGGGk..','..kggggrrGGGGk..','...kggggGGrGk...','....kgGGGGGk....','.....kkkkkk.....','.......kbk......','.......kbk......','.......kbk......','.......kbk......','.......kbk......','...bbbbbbbbbb...','..bbbbbbbbbbbb..'];
          var colors = {k:'#1b1b2f',g:'#3ccb5e',G:'#2e8b3a',b:'#8a4a22',r:'#ff4f6d'}; var ctx = plant.getContext('2d');
          rows.forEach(function (row,y) { Array.from(row).forEach(function (pixel,x) { if (colors[pixel]) { ctx.fillStyle = colors[pixel]; ctx.fillRect(x,y,1,1); } }); });
          button.appendChild(plant);
        }
        button.addEventListener('click',function () { chosenDate = date; $('selected-date').textContent = date === 13 ? 'Thứ Sáu, 13/11/2026' : 'Ngày ' + date + '/11/2026'; drawMonth(); tell('Chọn ngày chỉ đổi nhãn trong bản mẫu. Bản nháp minh họa được giữ nguyên.'); }); grid.appendChild(button);
      })(d);
    }
  }
  drawMonth(); $('today-pick').addEventListener('click',function () { chosenDate = 13; $('selected-date').textContent = 'Thứ Sáu, 13/11/2026'; drawMonth(); });
  var key = 'kotoba-ux-proposal-diary';
  try { var draft = localStorage.getItem(key); if (draft !== null) $('diary-text').value = draft; } catch (_) {}
  var saveTimer;
  function updateCount() { $('diary-count').textContent = $('diary-text').value.length + ' / 200 ký tự'; }
  $('diary-text').addEventListener('input',function () {
    updateCount(); $('save-state').textContent = 'Đang lưu bản mẫu…'; clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { try { localStorage.setItem(key,$('diary-text').value); $('save-state').textContent = 'Đã lưu bản mẫu trên máy'; } catch (_) { $('save-state').textContent = 'Chưa lưu được · hãy sao chép nội dung'; } },350);
  }); updateCount();
  function editorTab(writing) {
    $('diary-pane').hidden = writing; $('writing-pane').hidden = !writing;
    $('diary-tab').classList.toggle('selected',!writing); $('writing-tab').classList.toggle('selected',writing);
    $('diary-tab').setAttribute('aria-selected',String(!writing)); $('writing-tab').setAttribute('aria-selected',String(writing));
  }
  $('diary-tab').addEventListener('click',function () { editorTab(false); }); $('writing-tab').addEventListener('click',function () { editorTab(true); });
  document.querySelectorAll('.moods button').forEach(function (button) { button.addEventListener('click',function () { document.querySelectorAll('.moods button').forEach(function (b) { b.classList.remove('selected'); }); button.classList.add('selected'); document.querySelector('.moods>span').textContent = button.getAttribute('aria-label'); }); });
  $('demo-complete').addEventListener('click',function () {
    $('writing-status').querySelector('b').textContent = 'Bài sửa đã sẵn sàng'; $('writing-status').querySelector('p').textContent = 'Bản nháp nhật ký được giữ nguyên.';
    $('demo-complete').hidden = true; $('writing-tab').querySelector('.badge').textContent = 'Đã xong';
    $('correction-status').hidden = true; $('correction-result').hidden = false;
  });
  $('ruby-toggle').addEventListener('click',function () { var hide = document.querySelector('.article').classList.toggle('hide-ruby'); $('ruby-toggle').textContent = hide ? 'Hiện furigana' : 'Ẩn furigana'; });
  $('translation-toggle').addEventListener('click',function () { $('translation').hidden = !$('translation').hidden; });
  $('word-lookup').addEventListener('click',function () { $('word-detail').scrollIntoView({block:'nearest'}); $('word-detail').style.outline = '3px solid #ffd23f'; setTimeout(function () { $('word-detail').style.outline = ''; },1600); });
  $('news-open').addEventListener('click',function () { $('news-dialog').showModal(); }); $('news-close').addEventListener('click',function () { $('news-dialog').close(); });
})();
