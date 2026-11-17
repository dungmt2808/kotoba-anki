"""ことば畑 1.32 — "Ngôn ngữ trong vườn": chữ của StackChan, sinh hoạt, đồ nhặt, khách, tường / sàn, mùa, tiêu đề bảng và
trò chơi theo ngôn ngữ chọn ở ⚙ (Tự theo deck / Nhật / Anh / Trung / Hàn / Chỉ tiếng Việt). Thuần Python, không import
anki / aqt. Python chỉ giữ bảng chữ và gửi một lần cho trang (`bundle()`); trang (web/glang.js) chọn ngôn ngữ và đổi chữ.

Lựa chọn lưu ở cài đặt riêng máy (config "prefs", khoá "kb-glang") — không ghi gì vào collection. Sổ sinh hoạt / Hộp sưu
tầm / Album khách vẫn lưu theo mã → đổi ngôn ngữ qua lại không mất gì.

Mỗi mục: (tiếng Anh, chữ Trung giản thể, pinyin có dấu thanh, chữ Hàn, phiên âm Hàn theo Romaja quốc ngữ). Tiếng Nhật +
tiếng Việt giữ ở bảng gốc (life_core.ACTS, finds_core.FINDS, guest_core.GUESTS, decor_core, season_core). Câu tiếng Trung /
tiếng Hàn do Claude soạn; core/test_132.py soát pinyin bằng từ điển pinyin độc lập, chữ giản thể, phiên âm Hàn bằng bộ
chuyển Hangul → Romaja viết riêng trong test.
"""
from __future__ import annotations

LANGS = ("ja", "en", "zh", "ko", "vi")
CHOICES = ("auto",) + LANGS
LANG_NAMES = {"auto": "Tự theo deck", "ja": "Tiếng Nhật", "en": "Tiếng Anh", "zh": "Tiếng Trung", "ko": "Tiếng Hàn",
              "vi": "Chỉ tiếng Việt"}
PREF_KEY = "kb-glang"

# Sinh hoạt của StackChan (khoá = id việc trong life_core.ACTS)
ACTS: dict[str, tuple[str, str, str, str, str]] = {
    "neru": ("sleep", "睡觉", "shuìjiào", "자다", "jada"),
    "taisou": ("do morning exercises", "做早操", "zuò zǎocāo", "체조하다", "chejohada"),
    "kagami": ("look in the mirror", "照镜子", "zhào jìngzi", "거울을 보다", "geoureul boda"),
    "kigaeru": ("get changed", "换衣服", "huàn yīfu", "옷을 갈아입다", "oseul garaipda"),
    "ocha": ("make tea", "泡茶", "pào chá", "차를 끓이다", "chareul kkeurida"),
    "gohan": ("cook rice", "煮饭", "zhǔ fàn", "밥을 짓다", "babeul jitda"),
    "ryouri": ("cook a meal", "做菜", "zuò cài", "요리하다", "yorihada"),
    "taberu": ("eat a meal", "吃饭", "chī fàn", "밥을 먹다", "babeul meokda"),
    "arau": ("wash the dishes", "洗碗", "xǐ wǎn", "설거지하다", "seolgeojihada"),
    "oyatsu": ("have a snack", "吃零食", "chī língshí", "간식을 먹다", "gansigeul meokda"),
    "mizuyari": ("water the flowers", "浇花", "jiāo huā", "꽃에 물을 주다", "kkoche mureul juda"),
    "souji": ("clean the house", "打扫", "dǎsǎo", "청소하다", "cheongsohada"),
    "benkyou": ("study", "学习", "xuéxí", "공부하다", "gongbuhada"),
    "hon": ("read a book", "看书", "kàn shū", "책을 읽다", "chaegeul ikda"),
    "shinbun": ("read the newspaper", "看报纸", "kàn bàozhǐ", "신문을 읽다", "sinmuneul ikda"),
    "terebi": ("watch TV", "看电视", "kàn diànshì", "텔레비전을 보다", "tellebijeoneul boda"),
    "rajio": ("listen to the radio", "听收音机", "tīng shōuyīnjī", "라디오를 듣다", "radioreul deutda"),
    "gakki": ("play an instrument", "演奏乐器", "yǎnzòu yuèqì", "악기를 연주하다", "akgireul yeonjuhada"),
    "esa": ("feed the fish", "喂鱼", "wèi yú", "물고기에게 먹이를 주다", "mulgogiege meogireul juda"),
    "hi": ("warm up by the fire", "烤火", "kǎo huǒ", "불을 쬐다", "bureul jjoeda"),
    "kotatsu": ("sit at the kotatsu", "钻进被炉", "zuānjìn bèilú", "코타츠에 들어가다", "kotacheue deureogada"),
    "hirune": ("take a nap", "睡午觉", "shuì wǔjiào", "낮잠을 자다", "natjameul jada"),
    "denki": ("turn on the light", "开灯", "kāi dēng", "불을 켜다", "bureul kyeoda"),
    "karenda": ("check the calendar", "看日历", "kàn rìlì", "달력을 보다", "dallyeogeul boda"),
    "e": ("look at a painting", "看画", "kàn huà", "그림을 보다", "geurimeul boda"),
    "nikki": ("write in a diary", "写日记", "xiě rìjì", "일기를 쓰다", "ilgireul sseuda"),
    "asobu": ("play with the pet", "和宠物玩", "hé chǒngwù wán", "반려동물과 놀다", "ballyeodongmulgwa nolda"),
    "ame": ("listen to the rain", "听雨声", "tīng yǔshēng", "빗소리를 듣다", "bitsorireul deutda"),
    "mado": ("look outside", "看窗外", "kàn chuāngwài", "밖을 보다", "bakkeul boda"),
    "niwa": ("water the garden", "给院子浇水", "gěi yuànzi jiāo shuǐ", "마당에 물을 뿌리다", "madange mureul ppurida"),
    "tegami": ("get the mail", "取信", "qǔ xìn", "편지를 꺼내다", "pyeonjireul kkeonaeda"),
    "benchi": ("rest on the bench", "在长椅上休息", "zài chángyǐ shang xiūxi", "벤치에서 쉬다", "benchieseo swida"),
    "buranko": ("ride the swing", "荡秋千", "dàng qiūqiān", "그네를 타다", "geunereul tada"),
    "koi": ("feed the carp", "喂锦鲤", "wèi jǐnlǐ", "잉어에게 먹이를 주다", "ingeoege meogireul juda"),
    "mizukumi": ("draw water", "打水", "dǎ shuǐ", "물을 긷다", "mureul gitda"),
    "ochiba": ("sweep fallen leaves", "扫落叶", "sǎo luòyè", "낙엽을 쓸다", "nagyeobeul sseulda"),
    "akari": ("light the lantern", "点灯", "diǎn dēng", "등불을 켜다", "deungbureul kyeoda"),
    "hanami": ("enjoy the cherry blossoms", "赏樱花", "shǎng yīnghuā", "벚꽃 구경을 하다", "beotkkot gugyeongeul hada"),
    "yukidaruma": ("build a snowman", "堆雪人", "duī xuěrén", "눈사람을 만들다", "nunsarameul mandeulda"),
    "hoshi": ("look at the stars", "看星星", "kàn xīngxing", "별을 보다", "byeoreul boda"),
    "ashiyu": ("soak your feet in hot water", "泡脚", "pào jiǎo", "족욕을 하다", "jogyogeul hada"),
    "oyogu": ("swim in the sea", "在海里游泳", "zài hǎi li yóuyǒng", "바다에서 수영하다", "badaeseo suyeonghada"),
    "suna": ("build a sandcastle", "堆沙堡", "duī shābǎo", "모래성을 쌓다", "moraeseongeul ssata"),
    "tsuri": ("go fishing", "钓鱼", "diào yú", "낚시하다", "naksihada"),
    "yuuhi": ("watch the sunset", "看夕阳", "kàn xīyáng", "노을을 보다", "noeureul boda"),
    "parasoru": ("rest under the parasol", "在遮阳伞下休息", "zài zhēyángsǎn xià xiūxi", "파라솔 아래에서 쉬다",
                 "parasol araeeseo swida"),
    "omairi": ("pray at the shrine", "参拜", "cānbài", "참배하다", "chambaehada"),
    "te": ("wash your hands", "洗手", "xǐ shǒu", "손을 씻다", "soneul ssitda"),
    "suzu": ("ring the bell", "摇铃", "yáo líng", "방울을 울리다", "bangureul ullida"),
    "ema": ("write a wish plaque", "写绘马", "xiě huìmǎ", "소원패를 쓰다", "sowonpaereul sseuda"),
    "matsuri": ("go to the festival", "去庙会", "qù miàohuì", "축제에 가다", "chukjee gada"),
    "yatai": ("eat at a food stall", "在小摊吃东西", "zài xiǎotān chī dōngxi", "포장마차에서 먹다", "pojangmachaeseo meokda"),
    "ringoame": ("eat a candy apple", "吃苹果糖", "chī píngguǒtáng", "사과 사탕을 먹다", "sagwa satangeul meokda"),
    "kingyo": ("scoop goldfish", "捞金鱼", "lāo jīnyú", "금붕어를 건지다", "geumbungeoreul geonjida"),
    "taiko": ("play the taiko drum", "打太鼓", "dǎ tàigǔ", "북을 치다", "bugeul chida"),
    "hanabi": ("watch the fireworks", "看烟花", "kàn yānhuā", "불꽃놀이를 보다", "bulkkonnorireul boda"),
    "sanpo": ("take a walk", "散步", "sànbù", "산책하다", "sanchaekhada"),
    "takenoko": ("dig up bamboo shoots", "挖竹笋", "wā zhúsǔn", "죽순을 캐다", "juksuneul kaeda"),
    "zazen": ("meditate", "打坐", "dǎzuò", "좌선하다", "jwaseonhada"),
    "hotaru": ("watch the fireflies", "看萤火虫", "kàn yínghuǒchóng", "반딧불이를 보다", "banditburireul boda"),
    "onsen": ("bathe in the hot spring", "泡温泉", "pào wēnquán", "온천에 들어가다", "oncheone deureogada"),
    "gyunyu": ("drink milk", "喝牛奶", "hē niúnǎi", "우유를 마시다", "uyureul masida"),
    "yuki": ("watch the snow fall", "看雪", "kàn xuě", "눈을 보다", "nuneul boda"),
    "densha": ("wait for the train", "等电车", "děng diànchē", "전철을 기다리다", "jeoncheoreul gidarida"),
    "te_furu": ("wave goodbye", "挥手", "huī shǒu", "손을 흔들다", "soneul heundeulda"),
    "jusu": ("buy a juice", "买饮料", "mǎi yǐnliào", "주스를 사다", "juseureul sada"),
    "jitensha": ("wash the bike", "洗自行车", "xǐ zìxíngchē", "자전거를 닦다", "jajeongeoreul dakda"),
    "_idle": ("take a break", "休息一下", "xiūxi yíxià", "잠깐 쉬다", "jamkkan swida"),
}

# Đồ nhặt được (finds_core.FINDS)
FINDS: dict[str, tuple[str, str, str, str, str]] = {
    "katatsumuri": ("snail", "蜗牛", "wōniú", "달팽이", "dalpaengi"),
    "yotsuba": ("four-leaf clover", "四叶草", "sìyècǎo", "네잎클로버", "neipkeullobeo"),
    "koishi": ("pebble", "小石子", "xiǎo shízǐ", "조약돌", "joyakdol"),
    "hane": ("feather", "羽毛", "yǔmáo", "깃털", "gitteol"),
    "biidama": ("glass marble", "玻璃珠", "bōlizhū", "구슬", "guseul"),
    "tane": ("strange seed", "种子", "zhǒngzi", "씨앗", "ssiat"),
    "kaigara": ("seashell", "贝壳", "bèiké", "조개껍데기", "jogaekkeopdegi"),
    "hitode": ("starfish", "海星", "hǎixīng", "불가사리", "bulgasari"),
    "makigai": ("spiral shell", "海螺", "hǎiluó", "소라", "sora"),
    "seaglass": ("sea glass", "海玻璃", "hǎi bōli", "바다 유리", "bada yuri"),
    "ryuboku": ("driftwood", "浮木", "fúmù", "유목", "yumok"),
    "sakuragai": ("cherry blossom shell", "樱花贝", "yīnghuābèi", "벚꽃조개", "beotkkotjogae"),
    "omamori": ("lucky charm", "护身符", "hùshēnfú", "부적", "bujeok"),
    "suzu": ("little bell", "铃铛", "língdang", "방울", "bangul"),
    "emafuda": ("wish plaque", "绘马", "huìmǎ", "소원패", "sowonpae"),
    "omikuji": ("fortune slip", "神签", "shénqiān", "운세 쪽지", "unse jjokji"),
    "matsubokkuri": ("pine cone", "松果", "sōngguǒ", "솔방울", "solbangul"),
    "kouyou": ("red maple leaf", "红叶", "hóngyè", "단풍잎", "danpungip"),
    "yoyofusen": ("water balloon", "水气球", "shuǐ qìqiú", "물풍선", "mulpungseon"),
    "uchiwa": ("paper fan", "团扇", "tuánshàn", "부채", "buchae"),
    "omenko": ("festival mask", "面具", "miànjù", "가면", "gamyeon"),
    "kazaguruma2": ("pinwheel", "风车", "fēngchē", "바람개비", "baramgaebi"),
    "wataame": ("cotton candy", "棉花糖", "miánhuatáng", "솜사탕", "somsatang"),
    "kingyobukuro": ("goldfish in a bag", "金鱼", "jīnyú", "금붕어", "geumbungeo"),
    "takenoko2": ("bamboo shoot", "竹笋", "zhúsǔn", "죽순", "juksun"),
    "tentoumushi": ("ladybug", "瓢虫", "piáochóng", "무당벌레", "mudangbeolle"),
    "taketonbo": ("bamboo-copter", "竹蜻蜓", "zhúqīngtíng", "대나무 잠자리", "daenamu jamjari"),
    "sasabune": ("bamboo-leaf boat", "竹叶船", "zhúyèchuán", "대나무 잎 배", "daenamu ip bae"),
    "kokedama": ("moss ball", "苔藓球", "táixiǎnqiú", "이끼 공", "ikki gong"),
    "nukegara": ("cicada shell", "蝉蜕", "chántuì", "매미 허물", "maemi heomul"),
    "onsentamago": ("hot-spring egg", "温泉蛋", "wēnquándàn", "온천 달걀", "oncheon dalgyal"),
    "yunohana": ("hot-spring flakes", "温泉花", "wēnquánhuā", "온천 결정", "oncheon gyeoljeong"),
    "tenugui": ("hand towel", "手巾", "shǒujīn", "손수건", "sonsugeon"),
    "gyunyubin": ("milk bottle", "牛奶瓶", "niúnǎipíng", "우유병", "uyubyeong"),
    "yuoke": ("wooden bucket", "木桶", "mùtǒng", "나무 대야", "namu daeya"),
    "yuzu": ("yuzu", "柚子", "yòuzi", "유자", "yuja"),
    "kippu": ("old train ticket", "车票", "chēpiào", "기차표", "gichapyo"),
    "kitte": ("stamp", "邮票", "yóupiào", "우표", "upyo"),
    "ehagaki": ("picture postcard", "明信片", "míngxìnpiàn", "엽서", "yeopseo"),
    "kagi": ("key", "钥匙", "yàoshi", "열쇠", "yeolsoe"),
    "botan": ("button", "纽扣", "niǔkòu", "단추", "danchu"),
    "ekistamp": ("station stamp", "车站印章", "chēzhàn yìnzhāng", "역 스탬프", "yeok seutaempeu"),
}

# Khách ghé vườn (guest_core.GUESTS)
GUESTS: dict[str, tuple[str, str, str, str, str]] = {
    "suzume": ("sparrow", "麻雀", "máquè", "참새", "chamsae"),
    "neko": ("stray cat", "野猫", "yěmāo", "길고양이", "gilgoyangi"),
    "cho": ("swallowtail", "凤蝶", "fèngdié", "호랑나비", "horangnabi"),
    "kaeru": ("tree frog", "树蛙", "shùwā", "청개구리", "cheonggaeguri"),
    "sagi": ("egret", "白鹭", "báilù", "백로", "baengno"),
    "hotaru": ("firefly", "萤火虫", "yínghuǒchóng", "반딧불이", "banditburi"),
    "tanuki": ("raccoon dog", "狸猫", "límāo", "너구리", "neoguri"),
    "kitsune": ("red fox", "狐狸", "húli", "여우", "yeou"),
    "shika": ("sika deer", "梅花鹿", "méihuālù", "꽃사슴", "kkotsaseum"),
    "kamome": ("seagull", "海鸥", "hǎi'ōu", "갈매기", "galmaegi"),
    "tsubame": ("swallow", "燕子", "yànzi", "제비", "jebi"),
    "fukuro": ("owl", "猫头鹰", "māotóuyīng", "부엉이", "bueongi"),
    "mejiro": ("white-eye", "绣眼鸟", "xiùyǎnniǎo", "동박새", "dongbaksae"),
    "komori": ("bat", "蝙蝠", "biānfú", "박쥐", "bakjwi"),
    "tsuru": ("red-crowned crane", "丹顶鹤", "dāndǐnghè", "두루미", "durumi"),
    "okojo": ("stoat", "白鼬", "báiyòu", "흰담비", "huindambi"),
}

# Tường / sàn (decor_core)
DECOR: dict[str, tuple[str, str, str, str, str]] = {
    "w_kem": ("plaster", "灰泥墙", "huīní qiáng", "회벽", "hoebyeok"),
    "w_soc": ("stripes", "条纹", "tiáowén", "줄무늬", "julmunui"),
    "w_sakura": ("cherry blossoms", "樱花", "yīnghuā", "벚꽃", "beotkkot"),
    "w_seigaiha": ("wave pattern", "青海波", "qīnghǎibō", "물결무늬", "mulgyeolmunui"),
    "w_asanoha": ("hemp-leaf pattern", "麻叶纹", "máyèwén", "삼베 무늬", "sambe munui"),
    "w_caro": ("check pattern", "格子", "gézi", "체크무늬", "chekeumunui"),
    "w_go": ("wood panels", "木板墙", "mùbǎn qiáng", "나무 벽", "namu byeok"),
    "w_gach": ("brick", "砖墙", "zhuānqiáng", "벽돌", "byeokdol"),
    "w_tre": ("bamboo", "竹子", "zhúzi", "대나무", "daenamu"),
    "w_may": ("sky and clouds", "蓝天白云", "lántiān báiyún", "하늘과 구름", "haneulgwa gureum"),
    "w_sao": ("starry sky", "星空", "xīngkōng", "별하늘", "byeolhaneul"),
    "w_shoji": ("shoji screen", "纸拉门", "zhǐ lāmén", "장지문", "jangjimun"),
    "f_soi": ("wood floor", "木地板", "mù dìbǎn", "마루", "maru"),
    "f_occho": ("walnut", "胡桃木", "hútáomù", "호두나무", "hodunamu"),
    "f_xuongca": ("herringbone", "人字拼", "rénzìpīn", "헤링본", "heringbon"),
    "f_tatami": ("tatami", "榻榻米", "tàtàmǐ", "다다미", "dadami"),
    "f_caro": ("checkerboard", "棋盘格", "qípángé", "바둑판무늬", "badukpanmunui"),
    "f_gom": ("terracotta", "陶砖", "táozhuān", "테라코타", "terakota"),
    "f_da": ("flagstones", "石板", "shíbǎn", "돌바닥", "dolbadak"),
    "f_tham": ("carpet", "地毯", "dìtǎn", "카펫", "kapet"),
    "f_co": ("lawn", "草坪", "cǎopíng", "잔디", "jandi"),
}

# Giao diện mùa (season_core: trường "jp")
SEASONS: dict[str, tuple[str, str, str, str, str]] = {
    "tet": ("Lunar New Year", "春节", "Chūnjié", "설날", "seollal"),
    "noel": ("Christmas", "圣诞节", "Shèngdànjié", "크리스마스", "keuriseumaseu"),
    "shogatsu": ("New Year", "新年", "xīnnián", "새해", "saehae"),
    "tsukimi": ("Moon viewing", "赏月", "shǎng yuè", "달맞이", "dalmaji"),
    "halloween": ("Halloween", "万圣节", "Wànshèngjié", "핼러윈", "haelleowin"),
    "momiji": ("Autumn leaves", "红叶", "hóngyè", "단풍", "danpung"),
    "tanabata": ("Tanabata", "七夕", "Qīxī", "칠석", "chilseok"),
    "natsumatsuri": ("Summer festival", "夏日祭", "xiàrìjì", "여름 축제", "yeoreum chukje"),
    "tsuyu": ("Rainy season", "梅雨", "méiyǔ", "장마", "jangma"),
    "hanami": ("Cherry blossom viewing", "赏樱", "shǎng yīng", "벚꽃놀이", "beotkkonnori"),
    "spring": ("Spring", "春天", "chūntiān", "봄", "bom"),
    "summer": ("Summer", "夏天", "xiàtiān", "여름", "yeoreum"),
    "autumn": ("Autumn", "秋天", "qiūtiān", "가을", "gaeul"),
    "winter": ("Winter", "冬天", "dōngtiān", "겨울", "gyeoul"),
}

# Câu StackChan nói (khoá = câu tiếng Nhật đang có trong mã JS). Mục: (Anh, Trung, pinyin, Hàn, câu tiếng Việt khi chọn
# "Chỉ tiếng Việt" — "" = câu gốc đã có phần tiếng Việt đi kèm, chỉ bỏ phần tiếng Nhật)
SAY: dict[str, tuple[str, str, str, str, str]] = {
    "ドンマイ！": ("Don't worry!", "没关系！", "méi guānxi", "괜찮아!", "Không sao đâu!"),
    "もう一回！": ("One more time!", "再来一次！", "zài lái yí cì", "한 번 더!", "Thêm lần nữa!"),
    "がんばった！": ("Good effort!", "你很努力！", "nǐ hěn nǔlì", "열심히 했어!", "Cố gắng lắm rồi!"),
    "いいね！": ("Nice!", "不错！", "búcuò", "좋아!", "Hay lắm!"),
    "その調子！": ("Keep it up!", "继续加油！", "jìxù jiāyóu", "계속 그렇게!", "Cứ thế nhé!"),
    "すごい！": ("Amazing!", "太棒了！", "tài bàng le", "대단해!", "Tuyệt quá!"),
    "天才！": ("Genius!", "天才！", "tiāncái", "천재!", "Thiên tài!"),
    "こんにちは！": ("Hello!", "你好！", "nǐ hǎo", "안녕!", "Xin chào!"),
    "がんばって！": ("You can do it!", "加油！", "jiāyóu", "화이팅!", "Cố lên!"),
    "えへへ": ("Hehe", "嘿嘿", "hēihēi", "헤헤", "Hì hì"),
    "おつかれさま！": ("Great work today!", "辛苦了！", "xīnkǔ le", "수고했어!", "Vất vả rồi!"),
    "目標達成！": ("Goal reached!", "目标达成！", "mùbiāo dáchéng", "목표 달성!", ""),
    "やった！": ("Yay!", "太好了！", "tài hǎo le", "해냈다!", "Tuyệt!"),
    "わあ！": ("Wow!", "哇！", "wa", "와!", "Oa!"),
    "宝箱！": ("Treasure chest!", "宝箱！", "bǎoxiāng", "보물상자!", ""),
    "ようこそ！": ("Welcome!", "欢迎！", "huānyíng", "어서 와!", "Chào mừng!"),
    "海の家へようこそ！": ("Welcome to the beach!", "欢迎来海边！", "huānyíng lái hǎibiān", "바닷가에 어서 와!", ""),
    "合格祈願！": ("Good luck on the test!", "祝你考试通过！", "zhù nǐ kǎoshì tōngguò", "합격 기원!", ""),
    "たこ焼き、いかが？": ("Takoyaki, anyone?", "来点章鱼烧吗？", "lái diǎn zhāngyúshāo ma", "다코야키 먹을래?",
                      "Ăn takoyaki không nè?"),
    "お茶をどうぞ～": ("Have some tea~", "请喝茶～", "qǐng hē chá", "차 드세요~", ""),
    "いい湯だな～": ("Lovely hot water~", "水真舒服～", "shuǐ zhēn shūfu", "물 좋다~", ""),
    "次は、ことば駅～": ("Next stop: Kotoba~", "下一站：言叶站～", "xià yí zhàn: Yányè zhàn", "다음 역은 코토바~", ""),
    "かわいい！": ("So cute!", "好可爱！", "hǎo kě'ài", "귀여워!", "Dễ thương quá!"),
    "新しい場所！": ("A new place!", "新地方！", "xīn dìfang", "새로운 곳!", ""),
    "新しい季節！": ("A new season!", "新季节！", "xīn jìjié", "새 계절!", ""),
    "新しい家！": ("A new house!", "新家！", "xīn jiā", "새 집!", ""),
    "似合う？": ("Does it suit me?", "好看吗？", "hǎokàn ma", "어울려?", ""),
    "スッキリ！": ("All tidy!", "清爽！", "qīngshuǎng", "깔끔!", "Gọn gàng!"),
    "新しい顔！": ("A new face!", "新表情！", "xīn biǎoqíng", "새 얼굴!", "Mặt mới!"),
    "ピカピカ！": ("Sparkling clean!", "亮晶晶！", "liàngjīngjīng", "반짝반짝!", ""),
    "よろしくね！": ("Nice to meet you!", "请多关照！", "qǐng duō guānzhào", "잘 부탁해!", ""),
    "おいしい！": ("Yummy!", "好吃！", "hǎochī", "맛있어!", "Ngon quá!"),
    "たねゲット！": ("Got seeds!", "得到种子！", "dédào zhǒngzi", "씨앗 획득!", ""),
    "新しい種！": ("A new seed!", "新种子！", "xīn zhǒngzi", "새 씨앗!", ""),
    "できた！": ("Done!", "做好了！", "zuò hǎo le", "완성!", ""),
    "いい感じ！": ("Looks good!", "不错哦！", "búcuò o", "좋은데!", "Được đó!"),
    "模様替え！": ("Makeover!", "换新装！", "huàn xīn zhuāng", "새 단장!", ""),
    "あれ？": ("Huh?", "咦？", "yí", "어?", "Ơ?"),
    "雨だ！": ("It's raining!", "下雨了！", "xià yǔ le", "비가 온다!", ""),
    "雷！": ("Thunder!", "打雷了！", "dǎléi le", "천둥이다!", ""),
    "雪だ！": ("It's snowing!", "下雪了！", "xià xuě le", "눈이 온다!", ""),
    "晴れ！": ("Sunny!", "晴天！", "qíngtiān", "맑다!", ""),
    "くもり…": ("Cloudy…", "阴天…", "yīntiān", "흐리다…", ""),
    "おはよう！": ("Good morning!", "早上好！", "zǎoshang hǎo", "좋은 아침!", "Chào buổi sáng!"),
    "お昼だ！": ("Lunchtime!", "中午了！", "zhōngwǔ le", "점심이다!", ""),
    "夕焼け、きれい！": ("What a sunset!", "晚霞真美！", "wǎnxiá zhēn měi", "노을 예쁘다!", "Hoàng hôn đẹp quá!"),
    "こんばんは～": ("Good evening~", "晚上好～", "wǎnshang hǎo", "좋은 저녁~", ""),
    "こんばんは！": ("Good evening!", "晚上好！", "wǎnshang hǎo", "좋은 저녁!", "Chào buổi tối!"),
    "星がきれい！": ("Lovely stars!", "星星真美！", "xīngxing zhēn měi", "별이 예쁘다!", ""),
    "春が来た！": ("Spring is here!", "春天来了！", "chūntiān lái le", "봄이 왔다!", ""),
    "夏だ！": ("It's summer!", "夏天到了！", "xiàtiān dào le", "여름이다!", ""),
    "秋だね～": ("It's autumn~", "秋天了～", "qiūtiān le", "가을이네~", ""),
    "冬だ！": ("Winter is here!", "冬天到了！", "dōngtiān dào le", "겨울이다!", ""),
    "お花見しよう！": ("Let's see the blossoms!", "去赏樱吧！", "qù shǎng yīng ba", "꽃구경 가자!", ""),
    "梅雨だね…": ("Rainy season…", "梅雨季节…", "méiyǔ jìjié", "장마네…", ""),
    "七夕だ！": ("It's Tanabata!", "七夕到了！", "Qīxī dào le", "칠석이다!", ""),
    "夏祭りだ！": ("Summer festival!", "夏日祭！", "xiàrìjì", "여름 축제다!", ""),
    "お月見だ！": ("Moon viewing!", "赏月啦！", "shǎng yuè la", "달구경하자!", ""),
    "トリック・オア・トリート！": ("Trick or treat!", "不给糖就捣蛋！", "bù gěi táng jiù dǎodàn", "과자 안 주면 장난칠 거야!", ""),
    "紅葉がきれい！": ("Lovely autumn leaves!", "红叶真美！", "hóngyè zhēn měi", "단풍이 예쁘다!", ""),
    "メリークリスマス！": ("Merry Christmas!", "圣诞快乐！", "Shèngdàn kuàilè", "메리 크리스마스!", ""),
    "あけましておめでとう！": ("Happy New Year!", "新年快乐！", "xīnnián kuàilè", "새해 복 많이 받아!", "Chúc mừng năm mới!"),
    "ハッピーハロウィン！": ("Happy Halloween!", "万圣节快乐！", "Wànshèngjié kuàilè", "해피 핼러윈!", ""),
    "お月見しよう！": ("Let's view the moon!", "一起赏月吧！", "yìqǐ shǎng yuè ba", "같이 달구경하자!", ""),
    "七夕だね！": ("It's Tanabata!", "七夕到了！", "Qīxī dào le", "칠석이네!", ""),
    "ひとやすみ": ("Take a break", "休息一下", "xiūxi yíxià", "잠깐 쉬자", "Nghỉ một lát"),
    "今行くよ！": ("Coming!", "马上来！", "mǎshàng lái", "지금 갈게!", ""),
    "お疲れさま": ("Great job", "辛苦了", "xīnkǔ le", "수고했어", ""),
    "すごい": ("Amazing", "真厉害", "zhēn lìhai", "대단해", ""),
    "おめでとう": ("Congrats!", "恭喜！", "gōngxǐ", "축하해!", ""),
    # trò chơi (theo ngôn ngữ của deck đang chơi)
    "やったね！": ("You did it!", "做到了！", "zuò dào le", "해냈어!", "Làm được rồi!"),
    "よくできました！": ("Well done!", "做得很好！", "zuò de hěn hǎo", "참 잘했어요!", "Giỏi lắm!"),
    "もう少し！": ("Almost there!", "差一点！", "chà yìdiǎn", "조금만 더!", "Chút nữa thôi!"),
    "時間切れ！": ("Time's up!", "时间到！", "shíjiān dào", "시간 끝!", "Hết giờ!"),
    "ありがとう！": ("Thank you!", "谢谢！", "xièxie", "고마워!", "Cảm ơn nha!"),
    "またね！": ("See you!", "再见！", "zàijiàn", "또 봐!", "Hẹn gặp lại!"),
    "遅すぎた…": ("Too slow…", "太慢了…", "tài màn le", "너무 늦었어…", "Chậm mất rồi…"),
    "えっ、違うよ…": ("Huh, that's not it…", "咦，不对哦…", "yí, bú duì o", "어, 그게 아니야…", "Ơ, không phải…"),
    "もういいです…": ("Never mind…", "算了吧…", "suàn le ba", "됐어요…", "Thôi khỏi…"),
    "完売！": ("Sold out!", "卖光了！", "mài guāng le", "완판!", ""),
    "閉店！": ("Closing time!", "关门了！", "guān mén le", "가게 문 닫아요!", ""),
    "守れた！": ("Garden saved!", "守住了！", "shǒu zhù le", "지켜냈다!", ""),
    "全部取られた…": ("They took it all…", "全被抢走了…", "quán bèi qiǎng zǒu le", "다 뺏겼어…", ""),
    "取られた！": ("Stolen!", "被抢走了！", "bèi qiǎng zǒu le", "뺏겼다!", "Mất rồi!"),
    "完璧！": ("Perfect!", "完美！", "wánměi", "완벽해!", ""),
    "クリア！": ("Cleared!", "过关！", "guòguān", "클리어!", ""),
    "書き取り完了！": ("Dictation done!", "听写完成！", "tīngxiě wánchéng", "받아쓰기 끝!", ""),
}

# Tiêu đề bảng (chữ trang trí trước tên tiếng Việt)
TITLES: dict[str, tuple[str, str, str, str, str]] = {
    "おうち": ("Home", "我的家", "wǒ de jiā", "우리 집", "uri jip"),
    "工房": ("Workshop", "工坊", "gōngfāng", "공방", "gongbang"),
    "新聞": ("Newspaper", "报纸", "bàozhǐ", "신문", "sinmun"),
    "花暦": ("Flower calendar", "花历", "huālì", "꽃달력", "kkotdallyeok"),
    "項目設定": ("Field setup", "字段设置", "zìduàn shèzhì", "필드 설정", "pildeu seoljeong"),
    "見た目": ("Appearance", "外观", "wàiguān", "화면", "hwamyeon"),
    "今日のミッション": ("Today's missions", "今日任务", "jīnrì rènwu", "오늘의 미션", "oneurui misyeon"),
    "ミニゲーム": ("Mini games", "小游戏", "xiǎo yóuxì", "미니게임", "minigeim"),
}

# Chữ tiếng Việt đi kèm câu tiếng Nhật mà chỉ đúng với người học tiếng Nhật (thi JLPT): đổi theo ngôn ngữ
VI_SUB: dict[str, dict[str, str]] = {
    "Cầu thi JLPT đỗ nè": {"en": "Cầu thi tiếng Anh đỗ nè", "zh": "Cầu thi HSK đỗ nè", "ko": "Cầu thi TOPIK đỗ nè",
                           "vi": "Cầu thi đỗ nè"},
}

# Tên 5 trò chơi (games.js, trường jp) theo ngôn ngữ của deck đang chơi
GAMES: dict[str, dict[str, str]] = {
    "listen": {"ja": "聞いて探そう", "en": "Listen & Find", "zh": "听音找词", "ko": "듣고 찾기"},
    "market": {"ja": "朝市", "en": "Morning Market", "zh": "早市", "ko": "아침 시장"},
    "crow": {"ja": "カラス追い", "en": "Shoo the Crows", "zh": "赶乌鸦", "ko": "까마귀 쫓기"},
    "memory": {"ja": "神経衰弱", "en": "Memory", "zh": "翻牌配对", "ko": "짝 맞추기"},
    "cloze": {"ja": "穴埋め", "en": "Fill the Gap", "zh": "填空", "ko": "빈칸 채우기"},
}
# Khách ở Chợ sáng hỏi mua (%s = chữ trên biển cây)
ASK: dict[str, list[str]] = {
    "ja": ["「%s」ください！", "「%s」はありますか？", "「%s」をひとつ！"],
    "en": ["“%s”, please!", "Do you have “%s”?", "One “%s”, please!"],
    "zh": ["请给我「%s」！", "有「%s」吗？", "来一个「%s」！"],
    "ko": ["“%s” 주세요!", "“%s” 있어요?", "“%s” 하나 주세요!"],
    "vi": ["Cho mình “%s”!", "Có “%s” không?", "Một “%s” nhé!"],
}
# Góc thẻ Lật cặp: chữ / nghĩa / cách đọc / Hán Việt (ja còn 文 = mẫu ngữ pháp, 語 = từ vựng)
TAGS: dict[str, dict[str, str]] = {
    "ja": {"kanji": "字", "grammar": "文", "word": "語", "meaning": "意", "reading": "読", "hanviet": "漢"},
    "en": {"kanji": "W", "grammar": "G", "word": "W", "meaning": "M", "reading": "R", "hanviet": "HV"},
    "zh": {"kanji": "字", "grammar": "文", "word": "词", "meaning": "意", "reading": "音", "hanviet": "汉"},
    "ko": {"kanji": "字", "grammar": "문", "word": "단", "meaning": "뜻", "reading": "음", "hanviet": "한"},
    "vi": {"kanji": "C", "grammar": "NP", "word": "T", "meaning": "N", "reading": "Đ", "hanviet": "HV"},
}


def bundle() -> dict:
    """Bảng chữ gửi cho trang một lần (glang.js). Mục ACTS / FINDS… giữ dạng mảng [en, zh, pinyin, ko, romaja]."""
    return {"choices": list(CHOICES), "names": LANG_NAMES, "pref": PREF_KEY,
            "acts": {k: list(v) for k, v in ACTS.items()}, "finds": {k: list(v) for k, v in FINDS.items()},
            "guests": {k: list(v) for k, v in GUESTS.items()}, "decor": {k: list(v) for k, v in DECOR.items()},
            "seasons": {k: list(v) for k, v in SEASONS.items()}, "say": {k: list(v) for k, v in SAY.items()},
            "titles": {k: list(v) for k, v in TITLES.items()}, "sub": VI_SUB, "games": GAMES, "ask": ASK, "tags": TAGS}


def item(table: dict, key: str, lang: str) -> tuple[str, str]:
    """(chữ, cách đọc) của một mục theo ngôn ngữ; ("", "") nếu không có / "vi" / "ja" (dùng bảng gốc)."""
    row = table.get(key)
    if not row or lang not in ("en", "zh", "ko"):
        return "", ""
    return (row[0], "") if lang == "en" else (row[1], row[2]) if lang == "zh" else (row[3], row[4])
