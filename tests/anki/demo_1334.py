"""Thêm vào collection mẫu của demo_col.py: nhiều deck con (cho ô chọn deck dạng cây), thẻ trắc nghiệm tự lật
(mẫu thẻ gọi pycmd('ans') khi bấm một đáp án, như nhiều mẫu thẻ chia sẻ trên mạng) và thẻ bài đọc dài — cho ảnh phác 1.34.

Chữ trong thẻ là câu tự viết (không chép giáo trình nào). Chạy sau demo_col.py:
    python demo_1334.py BASE/Test/collection.anki2   (python của venv có anki)
"""
import random, sys, time
from anki.collection import Collection

WORDS = [("学生", "がくせい", "học sinh"), ("先生", "せんせい", "giáo viên"), ("食べる", "たべる", "ăn"), ("飲む", "のむ", "uống"),
         ("見る", "みる", "xem"), ("行く", "いく", "đi"), ("来る", "くる", "đến"), ("帰る", "かえる", "về"), ("読む", "よむ", "đọc"),
         ("書く", "かく", "viết"), ("聞く", "きく", "nghe"), ("話す", "はなす", "nói"), ("買う", "かう", "mua"), ("待つ", "まつ", "chờ"),
         ("起きる", "おきる", "thức dậy"), ("寝る", "ねる", "ngủ"), ("天気", "てんき", "thời tiết"), ("雨", "あめ", "mưa"),
         ("花", "はな", "hoa"), ("山", "やま", "núi"), ("川", "かわ", "sông"), ("海", "うみ", "biển"), ("空", "そら", "bầu trời")]

# Mẫu thẻ trắc nghiệm: bấm một đáp án → tô màu → 0,4 giây sau tự lật (pycmd('ans')). Mặt sau đọc lựa chọn từ sessionStorage.
MC_FRONT = """<div class="mc-q">{{Câu hỏi}}</div>
<div class="mc-opts" id="mc-opts"></div>
<script>
(function () {
  var opts = ["{{A}}", "{{B}}", "{{C}}", "{{D}}"], box = document.getElementById("mc-opts");
  try { sessionStorage.removeItem("mc-pick"); } catch (e) {}
  opts.forEach(function (t, i) {
    var b = document.createElement("button"); b.className = "mc-opt"; b.textContent = "ABCD"[i] + ". " + t;
    b.onclick = function () {
      try { sessionStorage.setItem("mc-pick", String(i)); } catch (e) {}
      b.classList.add("is-pick");
      setTimeout(function () { if (typeof pycmd !== "undefined") { pycmd("ans"); } }, 400);
    };
    box.appendChild(b);
  });
})();
</script>"""
MC_BACK = """<div class="mc-q">{{Câu hỏi}}</div>
<div class="mc-opts" id="mc-opts"></div>
<script>
(function () {
  var opts = ["{{A}}", "{{B}}", "{{C}}", "{{D}}"], right = "ABCD".indexOf("{{Đáp án}}"), pick = -1, box = document.getElementById("mc-opts");
  try { pick = Number(sessionStorage.getItem("mc-pick")); } catch (e) {}
  opts.forEach(function (t, i) {
    var b = document.createElement("div"); b.className = "mc-opt" + (i === right ? " is-right" : i === pick ? " is-wrong" : "");
    b.textContent = "ABCD"[i] + ". " + t; box.appendChild(b);
  });
})();
</script>
<hr id=answer><div class="mc-note">{{Giải thích}}</div>"""
MC_CSS = """.card{font-family:sans-serif;font-size:22px;text-align:center}
.mc-q{font-size:30px;margin:10px 0 16px}.mc-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:640px;margin:0 auto}
.mc-opt{font-size:20px;padding:12px;border:2px solid #888;border-radius:8px;background:#fff;cursor:pointer}
.mc-opt.is-pick{background:#ffe9a8}.mc-opt.is-right{background:#c8f7d2;border-color:#2c8a4a}.mc-opt.is-wrong{background:#ffd0d0;border-color:#c23}
.mc-note{font-size:18px;color:#555}"""

MC = [("「学生」の 読み方は？", "がくせい", "がくしょう", "かくせい", "がっせい", "A", "学生 = がくせい (học sinh)"),
      ("「飲む」の 意味は？", "ăn", "uống", "đi", "nghe", "B", "飲む = のむ (uống)"),
      ("「雨」の 読み方は？", "ゆき", "くも", "あめ", "かぜ", "C", "雨 = あめ (mưa)"),
      ("「帰る」の 意味は？", "đến", "đi", "chờ", "về", "D", "帰る = かえる (về)")]

READ = """<div class="rd-title">{{Tiêu đề}}</div><div class="rd-body">{{Bài đọc}}</div><div class="rd-q">{{Câu hỏi}}</div>"""
READ_BACK = """{{FrontSide}}<hr id=answer><div class="rd-ans">{{Đáp án}}</div>"""
READ_CSS = """.card{font-family:sans-serif;font-size:20px;line-height:1.8;text-align:left;max-width:760px;margin:0 auto}
.rd-title{font-size:26px;font-weight:bold;margin-bottom:10px}.rd-body p{margin:0 0 14px}
.rd-q{margin-top:18px;padding:10px 14px;background:#f3efe2;border-left:4px solid #b08a4a}.rd-ans{font-size:20px;color:#1f5faf}"""
PARA = ["わたしの 町には 小さな 公園が あります。", "毎朝 七時に 犬と いっしょに 公園へ 行きます。",
        "公園には 大きな 木が 三本 あって、春には 花が たくさん 咲きます。", "日曜日には 子どもたちが 走ったり、ボールで 遊んだり します。",
        "公園の 近くに パン屋が あります。", "そこの パンは 安くて、とても おいしいです。", "わたしは よく あんパンを 買って、ベンチで 食べます。",
        "雨の 日は 公園に 人が いません。", "でも、わたしは 雨の 公園も 好きです。", "木の 下で 雨の 音を 聞くと、心が しずかに なります。"]


def model(col, name, fields, qfmt, afmt, css):
    mm = col.models
    m = mm.new(name)
    for f in fields:
        mm.add_field(m, mm.new_field(f))
    t = mm.new_template("Thẻ 1")
    t["qfmt"], t["afmt"] = qfmt, afmt
    mm.add_template(m, t)
    m["css"] = css
    mm.add(m)
    return mm.by_name(name)


def main(path):
    col = Collection(path)
    voc = col.models.by_name("Từ vựng tiếng Nhật") or col.models.all()[0]
    fields = [f["name"] for f in voc["flds"]]
    rnd, today = random.Random(1334), col.sched.today
    # cây deck: N4 có 8 bài, N5 có 6 bài, ngữ pháp, tiếng Anh có Unit, ôn thi JLPT
    tree = (["Tiếng Nhật::N4::Bài %d" % b for b in range(15, 23)] + ["Tiếng Nhật::N5::Bài %d" % b for b in range(1, 7)]
            + ["Tiếng Nhật::Ngữ pháp::N5", "Tiếng Nhật::Ngữ pháp::N4"]
            + ["Tiếng Anh::B1::Unit %d" % u for u in range(1, 7)]
            + ["Ôn thi::JLPT N4::Từ vựng", "Ôn thi::JLPT N4::Đọc hiểu", "Ôn thi::JLPT N4::Nghe hiểu"])
    for k, name in enumerate(tree):
        did = col.decks.id(name)
        if name.endswith("Đọc hiểu"):
            continue                    # deck này chỉ có thẻ bài đọc dài
        for j in range(3 + k % 4):
            w, r, m = WORDS[(k * 3 + j) % len(WORDS)]
            n = col.new_note(voc)
            n[fields[0]] = w
            if len(fields) > 1:
                n[fields[1]] = r
            if len(fields) > 2:
                n[fields[2]] = m
            col.add_note(n, did)
        for j, cid in enumerate(col.find_cards('deck:"%s"' % name, order="c.id")):
            if j % 3 == 0:
                continue
            ivl = rnd.choice((1, 3, 8, 15, 30))
            col.db.execute("update cards set type=2, queue=2, ivl=?, due=?, factor=2500, reps=3, left=0 where id=?",
                           ivl, today + (0 if j % 2 else rnd.randint(1, 6)), cid)
    mc = model(col, "Trắc nghiệm", ["Câu hỏi", "A", "B", "C", "D", "Đáp án", "Giải thích"], MC_FRONT, MC_BACK, MC_CSS)
    d_mc = col.decks.id("Tiếng Nhật::Trắc nghiệm")
    for q in MC:
        n = col.new_note(mc)
        for f, v in zip(["Câu hỏi", "A", "B", "C", "D", "Đáp án", "Giải thích"], q):
            n[f] = v
        col.add_note(n, d_mc)
    rd = model(col, "Bài đọc", ["Tiêu đề", "Bài đọc", "Câu hỏi", "Đáp án"], READ, READ_BACK, READ_CSS)
    d_rd = col.decks.id("Ôn thi::JLPT N4::Đọc hiểu")
    for t in range(2):
        n = col.new_note(rd)
        n["Tiêu đề"] = ["わたしの 公園", "雨の 日"][t]
        n["Bài đọc"] = "".join("<p>%s</p>" % " ".join(PARA[(i + t) % len(PARA)] for i in range(k, k + 3)) for k in range(0, 18, 2))
        n["Câu hỏi"] = "問題：「わたし」は 雨の 日の 公園が 好きですか。どうしてですか。"
        n["Đáp án"] = "好きです。木の 下で 雨の 音を 聞くと、心が しずかに なるからです。"
        col.add_note(n, d_rd)
    col.close()


if __name__ == "__main__":
    main(sys.argv[1])
