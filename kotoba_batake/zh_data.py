"""Âm tiết pinyin hợp lệ (không thanh, ü viết v) — sinh bằng tests/tools/sinh_zh_data.py từ pypinyin, đừng sửa tay."""
SYLLABLES = frozenset("""
a ai an ang ao ba bai ban bang bao bei ben beng bi bian biang biao bie bin bing bo bong bu ca cai can cang
cao ce cei cen ceng cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui
chun chuo ci cong cou cu cuan cui cun cuo da dai dan dang dao de dei den deng di dia dian diao die din ding
diu dong dou du duan dui dun duo e ei en eng er fa fan fang fei fen feng fiao fo fou fu ga gai gan gang gao
ge gei gen geng gong gou gu gua guai guan guang gui gun guo ha hai han hang hao he hei hen heng hong hou hu
hua huai huan huang hui hun huo ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun ka kai kan kang
kao ke kei ken keng kong kou ku kua kuai kuan kuang kui kun kuo la lai lan lang lao le lei len leng li lia
lian liang liao lie lin ling liu lo long lou lu luan lun luo lv lve ma mai man mang mao me mei men meng mi
mian miao mie min ming miu mo mou mu na nai nan nang nao ne nei nen neng ni nia nian niang niao nie nin ning
niu nong nou nu nuan nun nuo nv nve o ou pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu
qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun ran rang rao re ren reng ri rong rou ru rua
ruan rui run ruo sa sai san sang sao se sen seng sha shai shan shang shao she shei shen sheng shi shou shu
shua shuai shuan shuang shui shun shuo si song sou su suan sui sun suo ta tai tan tang tao te tei teng ti
tian tiao tie ting tong tou tu tuan tui tun tuo wa wai wan wang wei wen weng wo wong wu xi xia xian xiang
xiao xie xin xing xiong xiu xu xuan xue xun ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun za zai
zan zang zao ze zei zen zeng zha zhai zhan zhang zhao zhe zhei zhen zheng zhi zhong zhou zhu zhua zhuai zhuan
zhuang zhui zhun zhuo zi zong zou zu zuan zui zun zuo
""".split())

# 1.33: cách đọc → các chữ Hán (GB2312 / Big5), mỗi dòng "âm1 âm2…\tchữ…"; thanh 5 = thanh nhẹ
READINGS_RAW = """
a1	锕
a1 a2 a3 a4 a5 e4	啊
a1 a2 a3 a4 a5 ha1 he1 huo1 ke1	呵
a1 a3 a4 a5 e1 e3	阿
a1 ang1 yan1	腌
a1 ke1	錒
a1 ya1	吖
a2 a5 sha4 xia4	嗄
ai1	哀哎溾锿
ai1 ai2	挨捱
ai1 ai3 ai4	唉嗳噯
ai1 ai3 e1 e2 e3 e4 ei1 ei2 ei3 ei4 xie4	欸
ai1 kai3	剴
ai1 shai1 xi3	諰
ai1 xi1	娭
ai1 zhi4	埃
ai2	啀敳溰皑皚
ai2 ai3 e4	娾
ai2 bao3 dai1	呆
ai2 dai1	獃
ai2 gai1 gai4 qi2	隑
ai2 gai4 wei2 wei4	磑
ai2 si4 tai3	騃
ai2 yan2	癌
ai3	昹毐矮蔼藹譪霭靄
ai3 chi4 si4 yi3	佁
ai3 hui2 hui3	烠
ai3 ji1 qi2 yi3	奇
ai3 jiu4	鯦
ai3 kai4 ke4	濭
ai3 nai3	乃
ai3 ye4	謁
ai3 yi1 yi4	噫
ai4	僾壒嫒嬡愛曖爱瑷璦砹碍薆鑀鴱
ai4 e4	阨隘
ai4 e4 e5	呃
ai4 e4 ye4	堨
ai4 gai1 hai4 he2 kai3	閡
ai4 he2	餲
ai4 kai4	欬
ai4 ni3 yi2 yi3 yi4	譺
ai4 ni3 yi2 yi4	儗
ai4 nuan3	暧
ai4 wo4	焥
ai4 wo4 yi4	嗌
ai4 yi2	礙
ai4 yi3	靉
ai4 yi3 yi4	醷
ai4 yi4	乂艾賹
an1	安峖氨盦腤萻谙鞍韽馣鹌
an1 an2	啽
an1 an3	侒垵
an1 an3 an4 yin1 yin3	闇
an1 an4	桉黯
an1 chang3 han3 yan2	厂
an1 e4 yan3	媕庵
an1 e4 yan4	鴳
an1 e4 ye4	痷
an1 guang3 yan3	广
an1 he2	盒
an1 qian2	鉗
an1 tou3	諳
an1 ya1	鵪
an1 yan3	菴
an1 yan3 yan4	裺
an1 yin1 yin4	陰
an2	雸
an2 an4	儑
an2 an4 han1 jian4	犴
an2 gan1	玵
an3	唵銨铵
an3 an4 yan3	晻
an3 e1 ke1	匼
an3 kan4 zhen1	碪
an3 yan3	埯
an3 yan4	俺
an3 yan4 ye4	揞
an4	岸按暗案荌豻錌
an4 e4	胺頞
an4 e4 yan4	洝
an4 gan1 gan4	干
an4 han1	頇
an4 nve4	婩
ang1 gang1 hang2	肮
ang1 kang3	骯
ang1 yan1	醃
ang2 yang3	仰卬
ang2 yang4	昂
ang4	盎醠
ao1	爊
ao1 ao2	熬
ao1 ao3 yao3	眑
ao1 ao4	柪
ao1 ao4 you3	坳
ao1 gun3 gun4 hun4	棍
ao1 lu4	熝
ao1 wa1	凹
ao1 yao3	鴢
ao1 you1	泑
ao2	嗷廒滶獒璈翱蔜螯遨隞鰲鳌鼇
ao2 ao4	傲敖謷
ao2 biao1	鏖
ao2 he2 qiao1 qiao4	礉
ao2 lu4	鏕
ao2 qiao1	摮磝
ao2 qiao1 qiao3 qiao4	磽
ao2 qiao1 qiao4	墽
ao2 xiao1	嚣囂
ao2 you2	聱
ao3	媼芺袄襖镺
ao3 ao4 niu4 yu4	拗
ao3 wo4 yun3	媪
ao3 xiao2	郩
ao3 yun1	蝹
ao4	墺奧岙岰嶴扷擙鏊骜
ao4 jiao1 nao4	澆
ao4 o1 yu3 yu4	噢
ao4 xiao4	奡
ao4 yao4	驁
ao4 you1 yu4	奥
ao4 yu4	懊澳燠薁隩
ba1	仈岜巴朳疤笆粑蚆豝
ba1 ba2	八
ba1 ba3 pa2	鈀
ba1 ba5 pa1	叭吧
ba1 bai3 bi3	捭
ba1 bai4 bie2 pa2	扒
ba1 bei4 bo1 bo2 po4	哱
ba1 bie1 bo2 fu2 pei4	柭
ba1 bie2	捌
ba1 ke4	峇
ba1 pa1	芭
ba2	犮癹胈菝軷魃
ba2 bei1 bi4 pi4	萆
ba2 bei4	跋
ba2 bei4 bie2 bo1 fa2	拔
ba2 bo2	詙
ba2 bo2 fa2 pei4	茷
ba2 bu4 pu1	抪
ba2 fei4	鼥
ba2 fei4 pei4	茇
ba2 pai4	湃
ba3 ba4	靶
ba3 ba4 pa2	把
ba3 pa2	钯
ba4	坝壩弝灞爸矲
ba4 ba5	罢
ba4 ba5 bai3 bi3 pi2 pi4	罷
ba4 bai3 bo2 mo4	伯
ba4 bo1	鲅
ba4 pa2	杷耙跁
ba4 po4	霸
bai1	挀掰
bai1 bo4	擘
bai2 bai4	拜
bai2 bo2	白
bai3	摆擺粨
bai3 bei1	襬
bai3 bo2 bo4	柏
bai3 bo2 mo4	百
bai3 mo4	佰絔
bai4	敗稗粺败
bai4 bei4 bi4	鞁
bai4 bei4 bu4 fu2	鞴
bai4 bei5	呗唄
bai4 bi4 bo2 bo4 pi4	薜
bai4 fei1 pai2 pei1 pei4	啡
bai4 mai4 pa1 pai4	派
bai4 pai2 pai3	排
bai4 pi2	猈
bai4 ting1 xin4	庍
ban1	斑斒班瘢癍颁
ban1 ban3 bo1 pan2	般
ban1 bei1 bi3 bi4 pi2	卑
ban1 ben1 bi4 fei2 fen2 fen4 lu4 pan1	賁
ban1 bin1	彬攽豳
ban1 fan1 pan1	籓
ban1 fen2	頒鳻
ban1 pan1	扳
ban1 pan2	褩
ban1 pan2 po2	搫
ban1 su4	搬
ban3	坂昄板版粄舨蝂鈑钣阪魬
ban3 feng3	覂
ban3 pan3	闆
ban4	办姅怑瓣絆绊辦鉡靽
ban4 bang4 bing4	並
ban4 bian3 bian4 pian2	辯
ban4 bian3 bian4 pian4	辨
ban4 fen1 fen3 huo3	扮
ban4 pan1	拌
ban4 pan2	湴跘
ban4 pan2 pan4	柈
ban4 pan3 pan4	坢
ban4 pan4	伴半
ban5	螁
bang1	垹帮幫梆邦鞤
bang1 bang4	縍
bang1 bin1	浜
bang1 pang2 peng1 peng2	彭
bang3	綁绑
bang3 bang4 beng1 pang2 peng2	榜
bang3 bang4 beng1 peng2	搒
bang3 bang4 pang1 pang2 pang3	膀
bang3 fang3 fang4	紡
bang3 pang1	牓
bang3 pang2	螃
bang4	塝棒玤艕謗谤镑
bang4 bei1 bei4 pei2 pou3	棓
bang4 beng1 pang2 peng1	旁
bang4 beng1 pang2 peng2	傍
bang4 beng1 pang3	嗙
bang4 beng3	埲
bang4 beng4 feng1 pi2	蚌
bang4 mang2	蛖
bang4 mang3	硥
bang4 pang1	鎊
bang4 pang1 pang2	磅
bang4 pang2	徬蒡
bao1	勹孢煲笣蕔褒齙龅
bao1 bao3	葆
bao1 bao4 pao1	鮑
bao1 biao1 pao2	苞
bao1 bo1 pu1	剥
bao1 cha2 jie1 ju1 xie2 zha3 zu1	苴
bao1 fu2	枹
bao1 fu2 pao2	包
bao1 pao2 pao4	炮胞
bao1 pou2	裒
bao2	窇雹
bao2 bao4 pao2	鉋
bao2 bo2 bo4 bu4	薄
bao2 pao4 pu1	砲
bao3	保媬宝寶褓飹飽饱駂鳵鴇鸨
bao3 bao4	怉
bao3 bu3 pu4	堡
bao4	儤忁报菢虣豹鑤髱鲍
bao4 bo1 chuo4 pao2 zhuo2	趵
bao4 bo2	爆
bao4 bo2 pao4	嚗
bao4 bo2 pu4	暴瀑
bao4 fu4	報
bao4 jiao1 lao2 miu4 xiao1	嘐
bao4 pao1 pou3	抱
bao4 pao2	刨袍
bao4 pao2 pao4	袌
bao4 pu4	曝
bei1	悲揹杯桮盃碑藣鵯鹎
bei1 bei4	背
bei1 bi1 bi3 bi4 pai2	箄
bei1 bi1 pi1 pi2	錍
bei1 bi3 bi4 pi4	俾
bei1 bi4 bing3 pi2	鞞
bei1 bi4 bo1	波
bei1 bi4 pai2 pi2	椑
bei1 bi4 pi2 pi4	埤
bei1 bi4 pi2 po1	陂
bei1 pei1	柸
bei1 pi3	諀
bei3 bei4	北悖
bei4	偝備备惫憊梖焙牬犕狈狽珼琲碚糒蓓褙誖貝贝輩辈邶郥鄁鋇鐾钡骳
bei4 bi4 bo2 fei4 fu2	茀
bei4 bi4 pi1 pi4	被
bei4 bo2	孛
bei4 bo2 pu2	菩
bei4 fei1 fei3 pei4	蜚
bei4 fei4 fu2	怫
bei4 fu4	萯
bei4 pai2 pei4	棑
bei4 pei2	倍
bei4 pu2	葡
bei5 bi4	臂
ben1	錛锛
ben1 ben3	本
ben1 ben4	泍渀
ben1 ben4 fen4	奔
ben1 bi4	贲
ben1 bing1	栟
ben1 fei2	蟦
ben1 fen2	鐼
ben3	畚翉苯
ben4	坌笨
ben4 cui4 ti1 ti3	体
ben4 fan4	軬
ben4 fen2	炃
ben4 fen4	坋
ben4 hang1	夯
beng1	伻嘣崩閍
beng1 beng3 beng4	繃绷
beng1 bing1 peng1	絣
beng1 bing4 peng2	痭
beng1 bing4 pian2 ping2	平
beng1 fang1	祊
beng1 peng1	抨
beng1 peng2	傰
beng2 qi4	甭
beng3	琫菶
beng3 feng3	唪
beng3 feng4	俸
beng3 pei3	琣
beng4	塴甏蹦迸
beng4 bing3 pian2	跰
beng4 liu2 pin4	泵
beng4 peng1 peng2 ping1	堋
beng4 peng2	錋
bi1	屄楅逼鵖
bi1 bi3 bi4 chi3 pi1 pi2	紕
bi1 bi3 pi1	鈚
bi1 bi4 pi2	笓
bi1 bian3	豍
bi1 fu2	幅
bi1 fu4	偪
bi1 pi1	鎞
bi1 pi2 pi4	媲
bi2	荸鼻
bi3	妣彼朼柀沘疕秕笔筆舭貏鄙
bi3 bi4 pi1 pi2	枇
bi3 bi4 pi2	芘
bi3 bi4 pi2 pi3	比
bi3 bi4 pi3	吡
bi3 fei2	肥
bi3 pi2	崥
bi3 pin4	匕
bi4	佖哔嗶坒堛壁奰妼婢嬖幣廦弊弼彃必怭愊愎敝斃梐毕毖毙湢滗滭潷熚狴獘獙珌璧畀畢疪痹痺皕碧筚箅篳粊綼縪繴罼腷荜蓖蓽蜌襞襣觱詖贔跸蹕躄避鄨鄪鏎铋閉閟闭陛飶馝駜驆髀髲鮅鷝鷩鼊
bi4 bian4	邲
bi4 bie1 pie1	蔽
bi4 bie2	咇柲
bi4 bie2 mi4	秘苾
bi4 bo2 fo2 fu2	佛
bi4 bo2 fu2 fu4	服
bi4 bo3 po1	跛
bi4 bo4	檗蘗
bi4 fei3 fei4	胇
bi4 fei4 fu2	費
bi4 fei4 fu2 pi4	拂
bi4 fu2	踾鶝
bi4 fu4	馥
bi4 han4	閈
bi4 lv4	虑
bi4 mi3 pi1 pi4	辟
bi4 mi4	泌祕
bi4 pai2 pi2 pi4	脾
bi4 pi1 po1	翍
bi4 pi2	庳篦裨陴
bi4 pi2 pi3	仳庇
bi4 pi4	濞稫
bi4 piao3	殍
bi4 pie1	瞥
bi4 se4	鉍
bi4 xi1	肸
bi4 yin4	币
bian1	煸甂砭笾箯籩编鞭鳊
bian1 bian3 bian4	編
bian1 bian3 pian1 pian2	扁
bian1 bian3 pian2	萹
bian1 bian4	揙
bian1 bian4 pian2	便
bian1 bian5	边邊
bian1 pian2	蝙
bian1 pian4	猵
bian1 zhen1 zhen3	稹
bian3	匾惼碥稨窆贬鴘
bian3 bian4	釆
bian3 bian4 pian2	緶
bian3 fa2	疺貶
bian3 feng1	封
bian3 pian1	鶣
bian3 pian2	褊
bian4	变忭抃汳汴艑苄變辩辫辮遍
bian4 fan1 fen4 pan4 pin1	拚
bian4 guan1	閞
bian4 pan2	卞弁
bian4 pian2	缏
bian4 yu3	頨
biao1	儦墂彪标滮瀌熛爂猋瘭臕贆鏢鑣镖镳飆飑飙飚
biao1 biao3 piao1 piao2 piao4	剽
biao1 biao4	標
biao1 biao4 pao1 piao1	摽
biao1 biao4 piao3 piao4	蔈
biao1 di2 shao2 shuo2 zhuo2	杓
biao1 diu1	颩
biao1 hu1 hu3	淲
biao1 huo3	灬
biao1 pao1	穮藨
biao1 pao2	颮
biao1 pao2 piao3	麃
biao1 piao1	謤驫
biao1 piao1 piao3 piao4	漂
biao1 piao2 piao4	嫖
biao1 piao3	篻膘
biao1 piao4	僄驃骠
biao1 piao4 shan1	髟
biao3	婊檦表裱褾諘錶
biao4	俵鰾鳔
bie1	憋虌鱉鳖
bie1 bie2	蟞
bie1 bie2 bie3	癟
bie1 bie3	瘪
bie1 pie1 pie3	撇
bie2	別徶蛂襒蹩
bie2 bie4	别
bie2 qie2	癿
bie4	彆
bin1	傧宾斌椕滨濒濱瀕繽缤虨賓邠鑌镔霦
bin1 bin4	儐
bin1 bing1	槟檳
bin1 fen1	玢
bin1 fen1 pin1	砏
bin1 fen4	份
bin1 huan1	豩
bin1 pa1 pa4	汃
bin1 pian2	璸
bin1 pin2	頻
bin1 yun1	贇
bin4	摈擯殡殯膑臏髌髕鬓鬢
bing1	兵冫掤
bing1 bing3 bing4 ping2	屏
bing1 bing4	并
bing1 ning2	冰
bing3	怲昺柄炳禀秉窉苪蛃邴陃餅饼
bing3 bing4	丙偋寎庰摒
bing3 fang1 fang3	枋
bing3 geng3	綆
bing3 lin3	稟
bing3 ping2	鉼
bing4	併病誁
bing4 pin1	拼
bing4 xian3	燹
bo1	僠剝嶓拨玻碆缽菠蹳钵餑饽鱍
bo1 bo2	脖
bo1 bo3	播
bo1 bo5	啵
bo1 e4	砵
bo1 fa1	發
bo1 fa2	撥
bo1 fan1 fan2 pan1 pan2 pan4 pi2 po2	番
bo1 fan1 fan2 pi2	蕃
bo1 fan1 pan1 pan2 pan4	潘
bo1 fu2	帗袚
bo1 li4 luo4	皪
bo1 pan2	磻
bo1 po1	潑
bo2	亳僰勃博帛懪挬搏欂浡渤犦瓝礡礴箔簙胉舶葧襮郣鈸鉑鋍鎛鑮钹铂餺駁駮驳鵓鹁
bo2 bo5	蔔
bo2 bu4	簿
bo2 bu4 fu1 po4 pu3	溥
bo2 fei4	襏
bo2 fou3 ye4	殕
bo2 fu2 fu4	榑
bo2 fu2 pei4	艴
bo2 gou4 hu4 huo4	豰
bo2 jue2 xue2	壆
bo2 lie4 po4	膊
bo2 mo4	袹
bo2 mu4	募
bo2 pa4	怕
bo2 pai1	拍
bo2 pao2	瓟
bo2 pao2 pao3	跑
bo2 po1 po4	泊
bo2 po4	猼馞髆
bo2 po4 tuo4	魄
bo2 po5	桲
bo2 pou4	踣
bo2 pu2	蒲
bo2 zhuo1	穛
bo2 zhuo2	彴
bo3 bo4	簸
bo3 pi2	蚾
bo4	糪譒
bo4 nie4	蘖
bo4 pi3	擗
bo5 bu3 pu1	卜
bu1	峬晡誧逋鈽钸
bu1 bu3 fu3	哺
bu1 bu3 pu1 pu2	鵏
bu1 bu4	餔
bu1 pu1	鯆
bu2	轐醭鳪
bu2 bu4 fou1 fou3 fu1	不
bu2 fu4	輹
bu2 pu1 pu2	僕
bu3	捕补補鸔
bu3 fu1 fu3	拊
bu3 ji1	卟
bu3 pu1	撲
bu4	佈咘埠布怖步篰蔀踄钚
bu4 fu1 fu3 po4	尃
bu4 fu1 fu4	附
bu4 pei2 pou3	婄
bu4 pou1	吥
bu4 pou3	瓿部
bu4 pu2 zhi4	捗
bu4 pu3	埔
ca1	擦
ca1 cai4 sa4	蔡
ca1 cha1	嚓
ca1 chai1 che4 chi4	拆
ca1 sa3	攃
ca3	礤礸
ca4 chen3	磣
ca4 za3 zha1	囃
cai1	猜
cai1 cai3 xiao1	啋
cai1 sai1	揌
cai1 si1 si3	偲
cai2	材裁財财
cai2 le4 li4	扐
cai2 shan1	纔
cai2 zai1	才
cai3	婇彩採睬綵跴
cai3 cai4	埰寀采
cai3 kui2	踩
cai4	棌縩菜
can1	嬠驂骖
can1 can4 cen1 san1 san3 shen1	參
can1 cen1	嵾
can1 cen1 shen1	参
can1 sun1	餐
can1 za2 zan4	囋
can2	惭慚残殘蠶
can2 chan4	摲
can2 jian1	戔
can2 jian1 jian4 qian3 zan4	淺
can2 tian3	蚕
can2 zan4	蹔
can3	惨慘憯黪黲
can3 cen1 shan1	穇
can3 cen1 zan1	篸
can3 jian4 qian2	朁
can3 sao1 shan1 xian1 xiao1	縿
can3 zan3	噆
can4	澯灿燦璨粲
can4 chan1 sen1 shan1 shan3	摻
can4 chan1 shan3	掺
can4 chan2 jian1 zhan4	孱
can4 qiao1 san3	鏒
cang1	仓嵢沧滄獊舱艙苍
cang1 cang3	蒼
cang1 chen5	伧
cang1 chen5 cheng2	傖
cang1 cheng1 qiang1	瑲
cang1 chuang4	倉凔
cang1 qiang1	鶬
cang2	鑶
cang2 zang1 zang4	臧藏
cao1	操糙
cao1 cao4 zao4	造
cao1 zao3	澡
cao2	嘈嶆曹艚螬
cao2 cao4	漕
cao2 cong2	慒
cao2 qiao1 sao4	鐰
cao2 zao1	傮槽
cao3	艸艹騲
cao3 che4	屮
cao3 sao1	慅
cao3 sao1 sao4	懆
cao3 zao4	草
cao4	肏襙
cao4 qi4	鼜
cao4 sao1	鄵
cao4 zao4	慥
ce4	冊恻惻憡测測策萴蓛
ce4 chuo4 se4	拺
ce4 ci4 si5 ze4	廁
ce4 ji2	簎
ce4 ji4	畟
ce4 jia1	筴
ce4 se4	粣
ce4 shan1 zha4	栅
ce4 she4	赦
ce4 si5	厕
ce4 ze2	幘
ce4 ze2 zha4	齰
ce4 ze4 zhai1	侧側
ce4 zha4	册
cen2	岑
cen2 chen2 qin2	梣
cen2 han2 jin4	笒
cen2 qian2 zan4	涔
ceng1 cheng1	噌
ceng2	层層驓
ceng2 ceng4	蹭
ceng2 seng1	僧
ceng2 zeng1	曾橧鄫
ceng2 zeng1 zeng4	增繒
ceng2 zheng1	嶒
cha1	偛嗏疀臿艖鍤锸
cha1 cha2	碴
cha1 cha2 cha3 cha4	叉
cha1 cha4	杈
cha1 cha4 chai1 chai4 ci1 cuo1 jie1	差
cha1 chai1	釵
cha1 chai1 zha3	扠
cha1 jie1 sha4 xie2	接
cha1 jie2 qie4	捷
cha1 lao3	荖
cha1 qi4 xi1	扱
cha1 suo3	鎈
cha1 zha1 zha5	喳
cha1 zha3	插
cha1 zha5	馇
cha2	垞搽槎猹茶
cha2 chai2 zha1	查
cha2 chi2	茬
cha2 chu2 ju3 xu2 zhu4 zu1	鉏
cha2 cui4	察
cha2 na2	秅
cha2 sa4	檫
cha2 shu1 tu2	捈
cha2 shu1 tu2 ye2	荼
cha2 tu1 tu2	梌
cha2 xia2 xie2 ye2	斜
cha2 zha1	楂
cha3	镲
cha3 cha4	衩
cha3 du4 tu2 tu3	土
cha3 zha1	蹅
cha4	侘奼姹岔汊紁诧
cha4 du4	詫
cha4 sha1	刹
chai1	钗
chai1 cuo1 cuo3	搓
chai2	侪儕喍祡豺
chai2 ci1 zhai4 zi4	柴
chai2 ci2 ci3 zi3	茈
chai2 zi1	齜
chai4	囆虿蠆袃
chai4 cuo2	瘥
chai4 dai4 di4	蔕
chan1	搀梴觇鋓
chan1 chan2	嚵辿
chan1 chan3 dan3 tan1 tuo1	嘽
chan1 chan4	幨
chan1 chan4 dan1	襜
chan1 chan4 tan3	裧
chan1 dan1 ji1	覘
chan1 dian1 zhan4	佔
chan1 dian4 tian1 zhan1	沾
chan1 lian3	襝
chan1 qian2 tie1	鉆
chan1 shan1 shan4 tian1	苫
chan1 shan4	攙
chan1 tan3 tian2	緂
chan1 tu2 tu4	兔
chan2	劖婵嬋巉廛棎毚湹潺瀍瀺煘獑磛纏缠艬蝉蟾讒谗酁鑱饞馋
chan2 chan3	繟
chan2 chan3 da2 dan4 shan4	僤
chan2 chan3 dan1 dan3 dan4 shan4 tan2 zhan4	單
chan2 chan4	儳
chan2 dan1 shan4	单
chan2 dan3 dan4 shan4 tan1 tian2 zhan3	撣
chan2 dan3 dan4 zhan1	亶
chan2 dan4 shan4 tan3 zhan3	儃
chan2 dan4 shan4 tuo2	蟺
chan2 dan4 tan2	繵
chan2 dan4 zhan1	澶
chan2 jian1 jian4 qian2	漸
chan2 jian4	螹
chan2 li2	厘
chan2 nian3 zhan3	蹍
chan2 shan4	嬗禅
chan2 shan4 tan2	禪
chan2 shan4 ti2	蟬
chan2 tan2 xin2	镡
chan2 tan3 zhan1 zhan4	襢
chan2 yan2	鋋
chan2 zhan3	嶄
chan2 zhan4	欃躔
chan2 zhuan4	僝
chan3	产冁剷囅嵼旵滻灛產簅蒇蕆諂谄鏟铲闡阐骣
chan3 chan4	幝
chan3 chan4 dan3	燀
chan3 chuan4	丳
chan3 da2 dan4	憚
chan3 dan4	譂
chan3 nian4 zhan3 zhen4	榐
chan3 shan4	墠
chan3 zhen3	辴
chan4	懺羼
chan4 chen4	讖
chan4 qian1 qian3	忏
chan4 shan1 zhan4	顫
chan4 zhan4	颤
chang1	伥娼淐猖琩菖裮錩阊鯧鲳鼚
chang1 chang4	倡昌
chang1 cheng2 zheng4	倀
chang1 tang1	閶
chang1 tang1 tang2	闛
chang2	仩偿償嘗嚐嫦尝常徜肠腸苌萇鋿鱨
chang2 chang3	场
chang2 chang3 dang4 shang1	場
chang2 cheng2	棖
chang2 shang4	尚
chang2 shang5	裳
chang2 tang3	倘
chang2 zhang3	长
chang2 zhang3 zhang4	長
chang2 zhang4	脹
chang3	廠昶氅鋹
chang3 chang4 tang3	淌
chang3 cheng4 zheng4	敞
chang3 tang3	惝
chang3 tang3 tang4	儻
chang4	唱怅悵暢畅韔鬯
chang4 dang4 yang2	瑒
chao1	弨怊钞
chao1 chao2 jiao3	勦樔
chao1 chao3	鈔
chao1 chao3 chao4 miao3	吵
chao1 chao3 chao4 suo1	抄
chao1 chao3 chao4 tiao4	超
chao1 chao3 miao3	訬
chao1 chuo4	綽绰
chao1 chuo4 zhuo1 zhuo2	焯
chao1 jiao3	剿劋摷
chao1 lao2 lao4 xiao1	嘮
chao1 shao4	紹
chao2	漅潮牊窲罺轈鄛
chao2 chao4	巢
chao2 chao4 zhao1	晁
chao2 dao4 shou4 tao1	濤
chao2 zhao1	嘲
chao2 zhao1 zhu1	朝
chao3	炒眧
chao3 chou1 zhou1	謅
chao3 jiao4 qiao2	趫
chao3 ju4	焣
chao3 you3	槱
chao4	耖
chao4 chuo4 tiao4 zhuo2	趠
chao4 cu4 zhou1 zhou4	縐
che1	砗硨莗
che1 ju1	車车
che3	扯撦
che3 chi3	尺
che3 duo3	奲
che4	坼彻徹掣撤澈烢硩迠
che4 chi2 tuo2	池
che4 chi4 zhe4	斥
che4 dian1 tie1 zhan1 zhan4	詀
che4 du4 zhai2	宅
che4 nie4	摰
che4 pi4	揊
che4 sha4	喢
che4 tie4	呫
che4 xi2	謵
chen1	琛諃賝
chen1 dian1	瘨
chen1 lan2	郴
chen1 nian3 tian3	捵
chen1 rong2	肜
chen1 shen1	抻棽綝
chen1 shen1 shen4	胂
chen1 shen4 tian2 tian4	瞋
chen1 tian2	嗔
chen1 zhen1 zhen4	侲
chen1 zhen3	縝
chen1 zhen4	謓
chen2	塵宸尘揨晨樄沉煁臣茞莐蔯螴諶谌辰陈鷐麎
chen2 chen3 dan1 jin4 shen4 tan2 yin2 yin3 zhan4	湛
chen2 chen4 nian3 zhen1 zhen3	趁
chen2 cheng2 deng4	橙
chen2 dan1 xin4	愖
chen2 dan4	忱
chen2 jian4 nian3 tian4	跈
chen2 lian2	帘
chen2 qin2 zhen4	鈂
chen2 shen3 tan2	沈
chen2 tian2 tian3 zhen4	填
chen2 zhan3 zhan4	棧
chen2 zhen1 zhen4	桭
chen2 zhen3	枕
chen2 zhen4	陳
chen3	墋碜贂踸
chen3 dan1	眈
chen3 kan1	堪
chen3 zhen1	鍖
chen4	嚫榇疢衬襯谶齔龀
chen4 cheng1 cheng4	称稱
chen4 chuang3	闖
chen4 guan4 qin4	櫬
chen4 pan2 shen3	瀋
chen4 qin1 qin4	儭
chen4 zhen3	疹
cheng1	偁撐撑棦橕檉浾琤蛏蟶赬鏿饓
cheng1 cheng2 qiang1 qiang3 qiang4	搶
cheng1 cheng2 ting1 zheng1	朾
cheng1 cheng4	牚竀
cheng1 cheng4 ping2	秤
cheng1 dang1	铛
cheng1 dang1 tang1	鐺
cheng1 ding1	虰
cheng1 jing4	净
cheng1 jue2	柽
cheng1 leng1 leng2 leng4 ling2	棱
cheng1 leng4	睖
cheng1 qiang1 qiang3	槍
cheng1 qiang1 qiang4	鎗
cheng1 tang1 tang4	蹚
cheng1 tang2	樘橖
cheng1 zhen1	湞
cheng1 zheng4	瞠
cheng2	城埕塍宬峸惩懲成掁枨溗澂碀程脭荿誠诚郕酲鋮铖騬
cheng2 cheng3	裎
cheng2 cheng3 kuang2	呈
cheng2 chu4 cu1	觕
cheng2 deng4	澄
cheng2 ding1	盯
cheng2 jing1 sheng4	晟
cheng2 jing1 xing3	醒
cheng2 jing4	淨
cheng2 qiang1 qiang4	嗆
cheng2 sheng4	乘嵊盛
cheng2 sheng4 zheng1 zheng3	丞
cheng2 tang1 tang4 zheng1 zheng4	趟
cheng2 ting3	珵
cheng2 ying2 ying3 ying4 zheng4	浧
cheng2 ying3	郢
cheng2 zheng1	埩
cheng2 zheng1 zheng4	脀
cheng2 zheng1 zhi3	徵
cheng2 zheng3	撜
cheng2 zheng3 zheng4	承氶
cheng3	庱悜騁骋
cheng3 leng2 leng4	踜
cheng3 ying2	逞
cheng4 dang3 tang3	黨
chi1	嗤媸摛攡瓻痴癡眵瞝笞蚩螭魑鴟鸱齝
chi1 chi2 di4	蚳
chi1 chu1	摴
chi1 di4 zhi1	胝
chi1 gu3 li2 li3 li4	離
chi1 he4 xia4	哧
chi1 jiao4 qiao4	噭
chi1 kai4	喫
chi1 lai4	誺
chi1 li2	樆离黐
chi1 qi1	吃
chi1 tai2	抬
chi1 xi1	郗
chi1 zhi3	絺
chi1 zhi4	胵
chi2	墀弛持篪茌荎謘貾踟迟馳驰
chi2 dai4 duo1 duo4	跢
chi2 di1 di2 shi4	鍉
chi2 di1 di3 shi2 ti2	提
chi2 di3	坻軧
chi2 di3 di4	柢
chi2 di4 shi4 ti2 zhi4	踶
chi2 duo4 tuo2	沱
chi2 hu3	箎
chi2 jie3 ta1	她
chi2 li2	驪
chi2 li2 li4	莉
chi2 ni4	迡
chi2 qi2	芪
chi2 qi2 zhi1 zhi3	祇
chi2 qu1	趍
chi2 quan2 yi2	狋
chi2 she2 tuo2 yi2	蛇
chi2 shi4 yi2	沶
chi2 shi5	匙
chi2 tai1	漦
chi2 tai2	箈
chi2 ti2	徲蝭鶗
chi2 yi2	耛謻
chi2 zhi1 zhi4	泜
chi2 zhi4	歭治遲
chi3	侈恥耻胣蚇褫鉹齒齿
chi3 chi4 die3 duo1 duo4 zha4	哆
chi3 chi4 duo4 yi2	誃
chi3 chu1	齣
chi3 chuai1 yi2	搋
chi3 chuai4	欼
chi3 hai4 yi2	拸
chi3 nuo3	袲
chi3 she1 zha1 zha4	奓
chi3 shi4	豉
chi3 tuo1	拖
chi3 tuo1 yi3	扡
chi3 yi2 yi4	移
chi3 ying1	呎
chi4	傺懘抶湁炽熾痸瘛翅翨赤遫鉓饎饬鶒鷘
chi4 di4	啻
chi4 die2	跮
chi4 duo1	剟
chi4 e2 hua4	叱
chi4 fu2	彳
chi4 huo4	捇
chi4 ni3	柅
chi4 shi4	飭飾
chi4 sou1	敕
chi4 tuo4	跅
chi4 xi1 xi3	喜
chi4 xi4	呬
chi4 xiao4	嘯
chi4 xue2	踅
chi4 xue4	趐
chi4 yi2	眙
chi4 zhi1	鳷
chi4 zhi4	滯瘈迣騺
chi5	麶
chong1	充忡憃沖浺珫罿翀茺蹖
chong1 chong3 chong4	衝
chong1 chong4	冲
chong1 chuang1 zhong1	舂
chong1 chuang2 tong2 zhong1	橦
chong1 tong2 zhong1	潼
chong1 tong2 zhong4	偅
chong1 tong2 zhuang4	艟
chong1 yong1 yong4	傭
chong1 yong3	涌
chong1 zhong1	盅
chong1 zhong4	祌
chong1 zhuang1	樁
chong1 zhuang4	憧
chong2	崇隀
chong2 dong4 tong2	酮
chong2 hui3	虫
chong2 jian3	茧
chong2 teng2	痋
chong2 tong2	爞
chong2 tong2 zhong4	蟲重
chong2 zhong1	蝩
chong2 zhong3 zhong4	种種
chong2 zhong4	緟
chong2 zhu2	烛
chong3	宠
chong3 long2	寵
chong4	銃铳
chong4 dong3	揰
chong4 tong2 zhuang4	僮
chou1	抽犨篘
chou1 chou2 zhou4	紬
chou1 die2	眣
chou1 lu4	瘳
chou1 shu1	跾
chou1 shu1 yao2 you2 yu2	揄
chou1 you4	牰
chou1 zhou1	婤
chou1 zhou1 zou1	掫
chou1 zhou2	妯
chou1 zhu1 zou3	搊
chou2	俦嬦懤栦燽畴疇筹絒绸菗讎踌躊酬雔雠
chou2 dao1	裯
chou2 dao1 qiu1	惆
chou2 dao3	擣
chou2 dao4	儔帱幬
chou2 dao4 tao2	檮
chou2 dao4 zhou4	薵
chou2 diao1 zhou4	椆
chou2 diao4 tao1	綢
chou2 diao4 tiao2	稠
chou2 huai2 quan3 zhen4	圳
chou2 jiu1 qiao3	愁
chou2 ju1 qiu2	仇
chou2 shi4 zhi4	畤
chou2 tao2	籌
chou2 tiao2 you2	鯈
chou2 you2	怞
chou2 zhou1	盩譸
chou2 zhou4	詶
chou3	丑吜杽瞅醜
chou3 kui4	媿
chou3 niu3	杻鈕
chou3 niu3 zhou3 zhou4	扭
chou3 qiao4 zou1	偢
chou4	殠
chou4 xiu4	溴臭
chou4 zao4	簉
chu1	出初樗貙
chu1 ou1 ou3 ou4 ou5 xu1	嘔
chu1 yao2 yu2	踰
chu2	刍厨幮廚橱櫥滁犓篨耡蒢趎蹰躕锄雏鶵
chu2 chu3	儲
chu2 chuo4	躇
chu2 ju2 ju4	雛
chu2 ju3	鋤
chu2 shu1 zhu4	除
chu2 tu2 ye2	涂
chu2 yu2	蜍
chu2 zha1 zhu1	藸
chu2 zhao1 zhao2 zhe5 zhu4 zhuo2	著
chu2 zhu1	蠩諸跦
chu2 zhu4	助
chu2 zou1	芻
chu2 zou4	媰
chu3	储杵楚檚濋础礎
chu3 chu4	处憷
chu3 chu4 ju4	處
chu3 chu4 zhu2	鸀
chu3 ning2 zhu4	柠
chu3 zhe3 zhu3	褚
chu3 zhu1	楮
chu4	亍儊搐斶歜珿琡矗絀绌臅触觸豖鄐黜
chu4 cong2 cuan2 zou1	菆
chu4 cu4	踀
chu4 ji2	諔
chu4 liu2	硫
chu4 na4 nv4 xu4	絮
chu4 qu1	詘
chu4 shou1	敊
chu4 shu1	淑
chu4 shu1 ti4	俶
chu4 tou4	埱
chu4 xu4	怵慉滀畜
chu4 zhou4 zhu4	祝
chu4 zhu2	蓫
chu4 zhu4	柷
chua1 cuo1 zuan1 zui4 zuo3	撮
chua1 hu1 xu1	欻
chuai1 chuai3 chuai4 duo3 tuan2 zhui1	揣
chuai2	膗
chuai2 chui2 hou2	腄
chuai4 chuan3 duan4 shuan4	踹
chuai4 chuo4 zhuo2	啜
chuai4 cui4 e4 za2 zu2	啐
chuai4 zha4 zhai4	膪
chuai4 zuo1	嘬
chuan1	川氚瑏
chuan1 chuan4	釧
chuan1 chuan4 shan1	猭
chuan1 chuan4 yuan1	穿
chuan1 shun4	巛
chuan2	暷椽船輲遄
chuan2 chuan3	歂
chuan2 chui2	圌
chuan2 duo3	椯
chuan2 tuan2	團
chuan2 xiang1	舡
chuan2 yuan4	掾
chuan2 zhuan4	传傳
chuan3	喘舛荈
chuan3 chun1 chun3	踳
chuan3 chun2 zhuan1 zhuan3	膞
chuan3 gua4 zhui4	惴
chuan4	汌玔賗钏
chuan4 guan4 quan4	串
chuan4 zhi4	鶨
chuang1	摐疮瘡
chuang1 chuang4	创
chuang1 chuang4 qiang1	創
chuang1 cong1	囱窗葱
chuang1 qiang1 qiang4	戧
chuang2	床
chuang2 tong2	朣
chuang2 zhuang4	幢
chuang3	傸磢闯
chuang3 chuang4	愴
chuang3 shuang3	漺
chuang4	刱怆
chui1	炊
chui1 chui4	吹
chui2	菙錘锤陲
chui2 dui1	搥
chui2 dui1 zhui4	槌鎚
chui2 duo3	捶棰
chui2 duo3 tuo3	鬌
chui2 tui2	魋
chui2 you2	郵
chui2 zhui1	椎箠
chui2 zhui4	倕垂
chui4 chuo4	惙
chun1	媋暙杶椿槆橁蝽鰆鶞
chun1 chun3	春
chun1 dun4 shun3	楯
chun1 quan2	輇
chun1 shun3	輴
chun1 tun2	芚
chun2	漘犉纯脣莼醇鯙鹑
chun2 dui4 duo4	錞
chun2 dun4 tun2 zhuan4	沌
chun2 quan2 tun2 zhun1 zhun3 zi1	純
chun2 tuan2	蓴鶉
chun2 tun2 zhun1 zhuo1	肫
chun2 zhen1 zhen4	唇
chun2 zhun1 zhun3	淳
chun3	偆惷萶蠢賰
chun3 qu2 xu1 xu4	朐
chuo1	戳
chuo1 chuo4	逴
chuo1 chuo4 diao4 tiao4 zhuo1	踔
chuo1 duo2 tu2	跿
chuo4	嚽擉歠磭輟辍辶齪龊
chuo4 cou4 cu4	簇蔟
chuo4 cu4	促娖
chuo4 cu4 lai4	娕
chuo4 duo2	踱
chuo4 jue2 xue4	吷
chuo4 nao4	婥
chuo4 nao4 zhao4 zhuo1	淖
chuo4 quan2	荃醛
chuo4 ruo4	婼
chuo4 shu2 zhu2	孎
chuo4 yao4 yue1	箹
chuo4 zhui4	綴腏錣
chuo4 zhuo2	斫
chuo4 zou1	齱
chuo4 zu2	鏃
ci1	偨趀
ci1 ci2 zi1	呲
ci1 ci3 cuo1	玼
ci1 ci3 zi3	跐
ci1 ci4 qi4	刺
ci1 cuo1	髊
ci1 cuo2	嵯齹
ci1 cuo4 suo3	縒
ci1 ji1 xi4 zi3	呰
ci1 ji2	蠀
ci1 ji4 zhai4 zi1	疵
ci1 zhai4	骴
ci2	嬨慈柌濨瓷磁糍茨詞词辞辭雌飺餈鶿鹚
ci2 ci4 zi1	次
ci2 ji2	堲
ci2 ji2 zi4	胔
ci2 ji4 qi2 qi4	薺
ci2 ji4 zi1	粢
ci2 si1 si4	司
ci2 si4	祠
ci2 si4 tai2	鈶
ci2 xuan2 zi1	滋
ci2 zi1	兹澬茲薋
ci3	佌此皉
ci3 ji4	鮆
ci3 zi3	泚
ci4	佽庛朿栨絘茦莿蛓賜赐
ci4 cuo4 ze2	措
ci4 hao2	蚝
ci4 se4	栜
ci4 si4	伺
ci4 xi1	螅
ci4 zi1	趑
cong1	匆囪暰瑽璁瞛聪聰苁蔥蟌鏦驄骢
cong1 cong2 zong1 zong3 zong4	從
cong1 song1	棇
cong1 song3 zong3	蓯
cong1 zong1	枞樅
cong1 zong1 zong3	總
cong1 zong3	偬熜
cong2	丛叢婃孮徖悰欉潀琮賨
cong2 cong4	藂
cong2 shuang4	淙
cong2 song3	漎
cong2 zong3 zong4	縱
cong2 zong4	从
cong4	謥
cou1 zou4	楱
cou3 cu4 qu1 qu4	趨
cou3 cu4 qu1 qu4 zou1	趣
cou4	凑湊腠輳辏
cou4 shu3 sou3	藪
cou4 sou3 zou4 zu2	族
cou4 zou4	奏揍
cu1	粗麤
cu1 ju4 qu1 zu1	怚
cu1 lu4	蔍
cu1 zhu4	麆
cu2	徂殂
cu2 ju1 qie3	且
cu3 cuo2 zha1	蔖
cu3 zha1	皻
cu4	憱猝瘯蹙顣鼀
cu4 cui4 zu2	卒踤
cu4 cuo4 xi1	錯
cu4 di2	踧
cu4 he2 za1	噈
cu4 jiu5 zu2	蹴
cu4 qi1	戚
cu4 qi1 qi4 se4 zu2	槭
cu4 qiu1	趥
cu4 su1 zun4 zuo2	捽
cu4 wei3	踓
cu4 zuo4	酢醋
cuan1	撺攛汆蹿躥镩
cuan1 cuan4	竄
cuan1 jian1 juan1	鋑
cuan2	巑
cuan2 cun2 cun3 dun1 qun3 zun1 zun2	蹲
cuan2 qian2 za1 zan4	灒
cuan2 zan3	攒
cuan2 zan3 zan4 zuan1	攢
cuan2 zuan4	欑
cuan2 zun3	僔
cuan4	爨窜篡
cuan4 kuan3	窾
cui1	催凗墔崔慛榱磪鏙
cui1 cui3	漼
cui1 cuo4 zui4	摧
cui1 shuai1 sui1	縗
cui1 shuai1 suo1	衰
cui1 wei2 zhui1	隹
cui1 zui3	嶉
cui3	璀
cui3 ju4 wei3	趡
cui3 sa3 sen3 xi3 xian3 xun4	洒
cui3 sui4	繀
cui4	悴焠瘁竁翠脆膬膵萃
cui4 qiao1 xia1	毳
cui4 sui4	粹脺
cui4 zu2	倅崒淬綷
cui4 zui3	濢
cui4 zuo2	椊
cun1	村皴
cun1 cun2 qiu4 qun1 zhun1 zun1	踆
cun1 zun1	墫
cun2	存
cun2 jian4	洊
cun2 jun4 xun4	浚
cun2 zun4	拵
cun3	刌忖
cun3 cun4	寸
cun4	籿
cun4 dou4 ying1	吋
cuo1	瑳磋蹉遳
cuo1 cuo3	醝
cuo1 ying2	營
cuo1 zui4	最
cuo2	痤矬蒫鹺鹾
cuo2 shi4	澨
cuo2 zan4	酇
cuo2 zuan1	躦
cuo3 qie1	脞
cuo4	剉剒夎棤莝蓌銼锉错
cuo4 ji2	厝
cuo4 xi1	昔
cuo4 zhuo2	斮
cuo4 zuo4	挫
da1	咑撘褡
da1 da2	哒噠答
da1 da2 da5	瘩
da1 da2 ta4	荅
da1 da5 ta3	塔
da1 da5 ta4	嗒
da1 he2 ke3	毼
da1 na4 xia2	笚
da1 sa4	鎝
da1 ta1	塌
da1 ta4	搭
da1 zhe2	矺耷
da2	匒妲炟畣笪羍薘躂迖鐽靼鞑龘
da2 da3	打
da2 dan3 tan2 tan3	胆
da2 dan4	怛
da2 dan4 ta3 ya4	呾
da2 die2 yi4	迭
da2 ta4	搨沓達鎉韃
da2 ta4 ti4	达
da3 zha1 zha3	觰
da4 dai4 tai4	大
da4 tai4	汏
da5	繨
da5 dan3	疸
dai1 dai3 e4	歹
dai1 dai4	待
dai1 tai3	呔
dai3	傣
dai3 dai4 di4	逮
dai4	代埭岱带帶廗戴柋殆瀻玳甙紿绐艜袋襶贷軑軩迨靆黛
dai4 dan1 die1 zhi4	蹛
dai4 di4	螮
dai4 di4 li4 yi4	隶
dai4 di4 shi4	遞遰
dai4 di4 ti4	棣
dai4 du2	毒蝳
dai4 duo4 tuo2	馱
dai4 lu4	逯
dai4 shi4 ti2 zhi1	媞
dai4 tai1 tai2 zhai4	駘
dai4 tai2	骀
dai4 tai2 yi2	詒
dai4 te4	貸
dai4 yi2	怠
dai4 zai1 zai3 zai4 zi1	載
dan1	丹勯匰殚殫砃箪簞耽聃聸襌郸
dan1 dan3 dan4 jie1	担
dan1 dan3 dan4 tan2	癉
dan1 dan4	甔瘅
dan1 dan4 shan4	儋擔
dan1 dan4 shan4 tan2	澹
dan1 duo1	鄲
dan1 nan2 ran3	冉
dan1 xian4	娊
dan1 yan2	檐
dan1 zhen4	酖
dan3	伔刐澸玬紞膽衴赕黕
dan3 dan4 tan4 xin2	撢
dan3 jing3	丼
dan3 shan4	掸
dan3 shen3	抌
dan3 shen4 tan4 zhen4	黮
dan3 zhan3	黵
dan3 zhan3 zhao1	皽
dan4	啖啗啿噉嚪帎惮憺旦柦氮沊泹狚癚禫窞萏蛋蜑觛誕诞贉霮髧鴠
dan4 han4	憾
dan4 kan3 qian4	欿
dan4 shan1	膻
dan4 shan4	贍
dan4 shan4 tan2 tan3	壇
dan4 shi1 tuo2 tuo3 yi2	訑
dan4 shi2	石
dan4 tan2	嘾弹彈惔餤
dan4 tan2 tan4	倓
dan4 tan2 xun2 yin3	潭
dan4 tan2 yan4	淡
dan4 tan3 yan4	但
dan4 xian2 yan2	唌
dan4 yan2 yan4	蜒
dan4 zhan1	詹
dang1	噹澢璫簹艡蟷裆襠
dang1 dang4	儅当檔
dang1 dang4 dang5	當
dang3	党谠
dang3 dang4	挡擋讜
dang3 tang3	攩欓
dang4	凼宕档璗瓽盪砀碭礑荡菪
dang4 shang1 tang2 yang2	愓
dang4 tang1	簜闣
dang4 tang1 tang4	蕩
dang4 tang2	嵣逿
dang4 tang4	燙
dang4 xiang4 yang3	潒
dang4 yang2	婸崵瘍
dao1	刂忉氘舠魛
dao1 dao2 tao1	叨
dao1 diao1	刀虭
dao1 diao4 tiao2 zhao1 zhou1	啁
dao2 dao3	捯
dao3	壔导岛島捣搗祷禂禱蹈
dao3 dao4	倒導菿道
dao3 diao3 niao3 que4	鳥
dao3 jiao1 jiao4	嘄
dao3 te4	忑
dao4	到悼檤瓙盗盜稻翿
dao4 diao1 dui1 dui4 dun1 dun4 tuan2 tun1 tun2 zhun3	敦
dao4 diao3 tiao1 tiao2 tiao4 yao2 zhao4	佻
dao4 diao4 tiao4	絩
dao4 du2	纛
dao4 shou4	受
dao4 tao1	焘燾
dao4 tao2 yao2	洮陶
dao4 zhao4	箌
dao4 zhou1	翢
de2	德淂锝
de2 de5 dei3	得
de2 deng1	登
de2 zhi4	陟
de5 di1 di2 di4	的
de5 di3	底
de5 di4	地
den4	扥扽
deng1	噔嬁燈璒簦豋
deng1 deng4	墱磴蹬鐙
deng1 ding1	灯
deng3	戥等
deng4	凳嶝瞪鄧镫
deng4 shan1	邓
di1	低彽滴磾羝袛鞮
di1 di2	鏑镝
di1 di2 zhe2	嘀
di1 di2 zhe2 zhi2	樀
di1 di3 shi2 ti2 wei2	堤
di1 di3 zhai1	牴
di1 di3 zhi1	氐
di1 di4 ti2	渧
di1 ti2	隄
di2	嚁嫡敵梑涤滌笛糴苖荻蔋藡觌迪靮馰鸐
di2 diao3 li4 yue1	扚
di2 diao4	魡
di2 diao4 tiao2	蓧
di2 diao4 you2	莜
di2 diao4 zhuo2	藋
di2 du2 yu4	儥
di2 hua2	敌
di2 ji2	覿
di2 shi4 ti4 zhe2	適
di2 ti4	狄鬄
di2 tun2 zhou4 zhu2	逐
di2 you2	浟
di2 za2	籴
di2 zhai2	翟
di2 zhao4	櫂
di2 zhi2	蹢
di2 zhu2	篴
di3	呧弤聜菧诋邸阺骶
di3 qi2 zhi3	抵
di3 shi4 ti4	楴
di3 ti4	詆
di3 zhi3	厎砥觝
di4	墑墬娣帝旳梊焍玓甋眱碲禘第締缔菂蒂谛递釱
di4 diao4	弔
di4 die2	嵽
di4 duo4	杕
di4 que4 shao2 xiao4	芍
di4 shao2 shuo4 zhuo2	勺
di4 shi4	諟
di4 ti1 ti2	睇
di4 ti2	珶諦蹄題
di4 ti4	揥
di4 ti4 tui2	弟
di4 yao1 yao4 yue1	約
di4 zhi4	墆疐
di4 zhuo1	蝃
dia3 die1	嗲
dian1	傎厧巅巔掂敁槙癫癲蹎顛颠齻
dian1 dian4	玷
dian1 dian4 sheng4 tian2 ying4	甸
dian1 nian1 nian3	拈
dian1 tian2 zhen1	滇
dian3	婰点碘蒧蕇踮
dian3 die1 die2 tie1 zhan4	跕
dian3 duo4 zhan1	點
dian3 tian3	典痶
dian4	垫墊壂婝店惦扂殿淀澱电癜簟電靛驔
dian4 ding4 ting2 zheng4 zun1	奠
dian4 nian4	唸
dian4 nian4 nie4	埝
dian4 ren4	腍
dian4 tan2	磹
dian4 tan2 xin2	橝
dian4 tian2	佃鈿钿
dian4 ting2	蜓
dian4 xian2 yan4	涎
dian4 yan2	阽
dian4 zhen1	坫
diao1	凋刁叼彫殦琱碉蛁貂雕鯛鲷鵰
diao1 dou1	瞗
diao1 tao2	錭
diao1 yao2	軺
diao1 zhao1	鳭
diao1 zhou1	淍
diao3	屌
diao3 niao3	鸟
diao3 zhou1	鵃
diao4	伄吊窵釣钓铞雿
diao4 nuo2	掉
diao4 qiao1 tiao2 yao2 yao4	銚
diao4 tao2 tiao1 tiao2 tiao3 tiao5	挑
diao4 tao2 tiao4	跳
diao4 ti4 zhou1	倜
diao4 tiao2	蜩调
diao4 tiao2 zhou1	調
diao4 tiao3	嬥誂
diao4 tiao4	糶
diao4 yao2	铫
diao4 zhao4	趙
die1	爹
die1 die2 tu2	跌
die2	叠垤堞峌牒瓞疊絰耋胅艓苵蜨褋詄谍蹀镻鲽
die2 die4 yi4	昳
die2 jie2 sha4 ti4 za1	啑
die2 qie4 xie4 yi4 zha2	渫
die2 qie4 zha2	喋鰈
die2 she2	碟
die2 she2 ye4	揲
die2 she4	挕涉
die2 shi4	崼
die2 ta3	鰨
die2 ti1	踢
die2 tie1	惵蝶
die2 tie3	鐵
die2 tu1 tui4	怢
die2 xi1 xi4 zhi4	咥
die2 xi2	槢
die2 xi2 zhe3	褶
die2 xie4	諜
die2 xie4 zha2	鞢
die2 ye4	楪
die2 yi4	佚泆
die2 yi4 zhe2	軼
die2 zhi2	臷
die2 zhi4	挃柣窒至螲
ding1	叮帄玎耵靪
ding1 ding3	仃酊
ding1 ding4	钉
ding1 ding4 ling2	釘
ding1 ne4	疔
ding1 tian3 ting1 ting3 zheng4	町
ding1 zheng1	丁
ding3	嵿薡頂顶
ding3 ding4	顁
ding3 ting1	艼
ding3 ting2	葶
ding3 ting4	濎
ding3 zhen1	鼎
ding4	啶定椗碇碠腚萣訂订錠锭飣
ding4 ting1 ting4	汀
ding4 ting3	鋌铤
ding4 zheng3	掟
diu1	丟丢銩铥
dong1	东冬咚埬岽東氡涷苳菄蝀鶇鸫
dong1 dong4	崠
dong1 tong2	鼕
dong3	嬞懂蕫
dong3 dong4 tong2	湩
dong3 tuan3	墥
dong3 zhong3	董
dong4	冻凍动動姛戙挏栋棟胨胴迵霘駧
dong4 liu2 tong2	硐
dong4 tong1	恫
dong4 tong1 tong2	桐絧
dong4 tong1 tong2 tong3	侗
dong4 tong2	峒洞烔狪詷
dong4 tong2 tong3	垌筒
dong4 tong2 tong3 yong3	筩
dong4 tong2 tong4	衕
dong4 yong3	甬
dong4 zhou1	騆
dou1	兜唗篼蔸
dou1 du1	都
dou1 lv2 shu1 yu2	氀
dou1 yu2	窬
dou3	抖蚪鈄陡
dou3 dou4 zhu3	斗
dou3 tou3	钭
dou3 zhu3	枓
dou4	梪浢痘窦脰荳豆郖酘餖鬥
dou4 du2	瀆竇讀读
dou4 qi2 tou2 zhu4	逗
dou4 tou1 tu4	鋀
dou4 tou2	投
dou4 yu2	逾
du1	嘟督醏
du1 du3 zhe3	堵
du1 she2	闍
du1 zhuo2	剢
du2	椟櫝殰渎牍牘犊犢独獨皾裻讟贕錖韇韣韥髑黩黷
du2 dun4	頓顿
du2 shu3	襡
du2 zhou2	碡
du2 zhou4 zhu2 zhuo2	噣
du2 zhu3	罜
du3	帾睹笃篤賭赌
du3 du4	肚
du3 du4 tu2	杜
du3 duo3 zhe3	鍺
du3 zhu2	竺
du3 zhu3	陼
du4	妒渡秺芏蠹鍍镀
du4 duo2	剫
du4 duo2 zhai2	度
du4 gao1 yi4 ze2	睪
du4 luo4 tuo2	橐
du4 tu2	塗
du4 tu2 yi4	斁
duan1	偳媏端
duan1 tuan2 zhi4	剬
duan1 zhuan1	耑
duan3	短
duan4	断斷椴段毈煅碫簖籪緞缎腶葮躖鍛锻
dui1	痽鴭
dui1 dui3	頧
dui1 dui4	碓
dui1 dui4 dun1	鐓
dui1 guo2 zhun3	埻
dui1 tui1 zhui1	追
dui1 zui1	堆
dui3 tui1 tun1 xiang1 zhun1	啍
dui4	兌对對怼憝懟濧瀩祋薱譈队
dui4 dun1	镦
dui4 duo2	奪
dui4 duo2 rui4	兑
dui4 shu1	杸
dui4 sui4 zhui4	隊
dui4 wei3	瀢
dui4 yun3	鈗
dun1	噸墩惇撉礅驐
dun1 dun4 tun2	燉豚
dun1 jun4 shun4	俊
dun1 tui2	橔
dun1 tun1	蜳
dun1 tun2 tun3	吨
dun3	趸躉
dun3 zhun1	盹
dun4	伅潡砘遯鈍钝
dun4 qun1 xun2	遁
dun4 shun3 yun3	盾
dun4 tu2	腯
dun4 tu2 zhuan4	腞
dun4 tun2	囤坉庉炖
dun4 tun2 zhun1	忳
duo1	咄多敪毲裰
duo1 duo2 zhuo1	掇
duo1 ji4	茤
duo2	夺敓鐸铎鮵
duo2 shi4 yi4 ze2	澤
duo2 tuo1	沰
duo2 yi4 ze2	襗
duo2 zha4	喥
duo3	哚嚲埵朵綞缍趓躲
duo3 duo4	垛
duo3 tuo3	橢
duo3 za2	杂
duo3 zhui4	硾
duo4	剁墯嶞舵跺陊鵽
duo4 hui1	堕隓
duo4 hui1 hui4	墮
duo4 li2 tuo4 yi2 zhi4	杝
duo4 li2 yi2	柂
duo4 na4	貀
duo4 sui2	陏
duo4 sui2 tuo1 tuo3	隋
duo4 tuo2	惰酡陀驮
duo4 tuo2 tuo3	柁
duo4 tuo2 xi1 yi1 yi2	詑
duo4 wu4 zuo2	柮
e1	屙
e1 e2 e3 e4 ei1 ei2 ei3 ei4 xi1 yi4	誒
e1 e3	婀
e1 ji4 wei1 yi1 yi3	猗
e1 ke1	痾
e1 ke1 qia4	疴
e2	俄囮娥峨涐珴皒睋莪訛讹迗锇額额鵝鹅
e2 ge2	佮
e2 ge2 ha1 ha2	蛤
e2 gui4 wei2 wei3	偽
e2 hua1	吪
e2 hua1 kui1 wei3	蒍
e2 hua4	魤
e2 o2 o4	哦
e2 tie3	鋨
e2 wo4 yi3	硪
e2 yi3	蛾
e3 e4	厄枙
e3 e4 hu1 wu1 wu4	惡
e3 e4 wu1 wu4	恶
e3 luo2	玀
e3 wo4 wu4	噁
e3 xia3	閜
e3 ya1	椏
e4	匎咢噩堮峉崿廅愕扼搹櫮歞砐砨腭苊萼蚅蝁諤谔豟軛軶轭遏遻鄂鍔鑩锷顎颚餓餩饿鱷鳄鶚鹗齶
e4 ge2 li4	鬲
e4 ge2 qie4 ya4	輵
e4 he2 he4	曷
e4 he4	齃
e4 heng1 heng4 za2	啈
e4 hua2 kua3 wu2	侉
e4 ji2	岋
e4 ke1	搕
e4 luo4 lve4	詻
e4 sheng4	垩
e4 wu3 ya1 ya4	埡
e4 wu4	蘁
e4 ya1 ya3	啞
e4 ya1 ya4	亞
e4 ya4	堊姶齾
e4 yan1	阏
e4 yan1 yu4	閼
e4 yi4	搤邑
ei2	诶
en1	奀恩蒽
en3	峎
en4	摁
en4 ye1 yi4	饐
eng1	鞥
er2	侕峏栭洏胹荋輀陑鮞鲕鴯鸸
er2 er4	咡
er2 er5 ren2	儿
er2 nai4	耏
er2 nao4 nen4 nuan3 ru2	臑
er2 neng2	而
er2 ni2	兒
er2 nuan2 nuo4 ru2 ruan3	濡
er2 nv4	聏
er2 reng2	陾
er2 wa1	唲
er3	尒尔栮毦洱珥薾迩邇铒餌饵駬
er3 er4 keng1	鉺
er3 mi3 ni3	爾
er3 nai3 ni4	嬭
er3 reng2	耳
er4	二刵衈貳贰
er4 nai4	佴
er4 rong2	髶
er4 zhi4	樲
fa1	沷
fa1 fa4	发
fa1 po1 po4	醱
fa2	乏伐垡瞂筏罚罰藅閥阀
fa2 fa3 ge2 jie2	砝
fa2 fan4	汎
fa2 fan4 feng3	泛
fa3	法
fa3 fa4	髮
fa4	珐琺
fan1	勫嬏幡旛翻轓颿鱕
fan1 fan2	墦繙藩
fan1 fan2 fan4	帆
fan1 huan1	犿
fan2	凡杋柉橎瀪瀿烦煩璠矾礬笲籵羳薠蘩蠜蹯鐇钒鷭
fan2 fan3 fan4	釩
fan2 fan4	樊氾
fan2 fen2	燔
fan2 feng1	楓
fan2 feng2	渢
fan2 ji2	伋
fan2 pan2	膰蟠
fan2 pan2 po2	繁
fan2 pan4	袢
fan3	返
fan3 fan4	反
fan4	奿梵滼犯畈笵範范販贩軓飯饭
fang1	淓芳鈁钫
fang1 fang2	坊妨
fang1 fang2 fang3 feng1 pang2 wang3	方
fang1 fang3 fang4	放
fang1 fang4	匚邡
fang1 pang1	汸
fang1 pang1 pang2	雱
fang2	肪防魴鲂
fang2 fang3 pang2	彷
fang2 pang2	房
fang3	倣昉瓬纺舫訪访髣鶭
fang3 pang2	仿
fei1	婓扉緋绯裶霏飛飞餥馡騑騛鲱
fei1 fei3	奜非
fei1 fei3 fei4	菲
fei1 fei3 fen1	匪
fei1 fei4	鯡
fei1 pei4	妃
fei2	淝腓
fei2 fei3	棐
fei2 fei3 fei4	痱
fei2 fei4	蜰
fei2 fei4 fu2	萉
fei2 pei2	裴
fei3	悱斐榧篚翡胐誹诽
fei3 ku1	朏
fei4	俷剕厞吠屝废廢昲曊櫠濷狒疿癈费鐨镄鼣
fei4 fen2	蕡
fei4 fen2 fen4	橨
fei4 fu2	沸砩祓笰紼芾
fei4 pei2	陫
fei4 pei4	肺
fei4 zi3	胏
fen1	兝昐棻氛紛纷翂芬酚鈖雰饙
fen1 fen2 fen4	分棼
fen1 fen2 pen2	汾
fen1 lun2	錀
fen1 min3	愍敃
fen1 pen2	衯
fen1 pen4	吩
fen2	坟妢枌梤羒羵蒶蚡豶轒黂鼖鼢
fen2 fen4	墳幩焚魵
fen2 pan4	盼
fen2 pen1	濆
fen2 pen2	葐
fen3	粉黺
fen4	偾僨奮弅忿愤憤瀵秎粪糞膹鲼
fen4 kang3	奋
fen4 pen1 pen4	噴
feng1	丰偑妦峰崶枫檒沣灃烽犎猦疯瘋砜蜂豐酆鋒锋飌风麷
feng1 feng3 feng4	風
feng1 feng4	桻葑
feng1 li3	豊
feng1 song1	蘴
feng2	堸捀艂
feng2 feng4	縫缝
feng2 pang2	夆舽逄
feng2 pang2 peng2	逢
feng2 peng3	摓
feng2 ping2	冯馮
feng3 feng4	諷讽
feng4	凤奉焨甮賵鳳
feng4 peng2	鵬
feng4 peng3	捧
fiao4	覅
fo2	坲
fou2	紑
fou2 fu1 fu2 pei1 pou2	垺
fou3	缶缹鴀
fou3 fu1 fu2	芣
fou3 pao2	炰
fou3 pei1	衃
fou3 pi3	否
fu1	伕呋孵怤敷砆稃糐綒肤荂荴衭趺邞麩麸
fu1 fu2	夫姇枎烰琈
fu1 fu2 fu3 zhou3	胕
fu1 fu3	鈇
fu1 fu3 fu4	柎
fu1 fu3 pu3	甫
fu1 fu4	傅紨跗
fu1 gui1	鳺
fu1 lu2	璷膚
fu1 lu4	鄜
fu1 mi4 wu4	沕
fu1 ou1 qiu1 xu1	蓲
fu1 pou1 pou2	捊
fu1 pu1 pu4	痡
fu2	俘冹凫刜匐咈垘孚岪幞弗彿柫桴氟泭浮澓玸符箙紱綍绂绋罘罦翇艀芙茯菔葍虙蚨蜉蝠袱諨輻辐郛韍鳧鴔鵩黻
fu2 fu4	伏咐洑福複
fu2 hai2 huan2	还
fu2 mi4	宓
fu2 piao3	莩
fu2 po2	巿
fu2 pou2	涪
fu2 pu2	扶纀苻襆
fu2 quan3	汱
fu2 shi4	市
fu2 su4	棴
fu3	俯府弣抚斧滏簠腐腑輔辅郙釜黼
fu3 fu4	父蚥
fu3 fu4 rong2 rong3	軵
fu3 mian3	俛
fu3 mo2	撫
fu3 pu2	脯莆蜅
fu3 tao1 tiao4	頫
fu3 wu3	嘸
fu4	付偩复妇婦嬔富復祔緮縛缚腹蕧蚹蛗蝜蝮褔覆訃讣負賦賻负赋赙赴鍑阜阝駙驸鮒鰒鲋鳆
fu4 huai2	怀
fu4 jin3 jin4 nu2	仅
fu4 nie4	峊
fu4 pei2 pou2 pou3	掊
fu4 pi4	副
ga1 ga2 ga3	嘎
ga1 ge1 ge2	胳
ga1 jia1 jia2	夹
ga1 jia1 jia2 xia2 xie2	夾
ga1 jia1 ka1	咖
ga1 jia1 qie2	伽
ga1 jia2	戛
ga1 jia3 xia1 xia2	呷
ga1 xu4	旮
ga2	尜钆
ga2 ge2	噶
ga2 qiu2	釓
ga2 ya4 zha2	軋轧
ga3	尕
ga4	尬
gai1	垓峐祴荄該该豥賅賌赅陔
gai1 gai3 hai3	胲
gai1 hai1 hai2 ke2	咳
gai1 hai2	骸
gai1 hai4	侅絯
gai1 he2 hu2 kai4	核
gai3	改
gai4	丐戤瓂鈣钙
gai4 ge2	杚
gai4 ge3	盖蓋
gai4 gui4 jie2	概
gai4 jie4	芥
gai4 qi4 yi3	汽
gai4 xi4	摡
gai4 xie4	溉
gai4 yi4	阣
gan1	坩尴尷漧玕疳筸肝苷
gan1 gan3 gan4	杆竿
gan1 gan3 gan4 han4	矸
gan1 gan4 guan3 han2	幹
gan1 han1	甘
gan1 han2	虷
gan1 han2 han4	汗
gan1 han4	泔釬
gan1 han4 yan4	鳱
gan1 hang4	酐
gan1 jian1	奸
gan1 qian2	乾柑
gan1 xian2	諴
gan3	擀敢橄皯秆稈笴趕
gan3 gan4	簳
gan3 gong1 long3	篢
gan3 han3	豃
gan3 han4	感扞桿澉
gan3 han4 xian4	捍
gan3 jian1 xian2	鰔
gan3 qian2	赶
gan4	凎灨盰紺绀詌赣骭
gan4 ge3 ge4	个
gan4 gong4 zhuang4	贛
gan4 han2	榦淦
gan4 han2 xian2	咁
gan4 han4	旰
gan4 qian4 xian4	錎
gang1	冈刚剛堈堽岡棡犅綱纲缸罡肛
gang1 gang3	岗崗
gang1 gang4	鋼钢
gang1 gang4 gong1	杠
gang1 geng1 kang4	亢
gang1 gong1	疘釭
gang1 hang2 hang4	頏
gang1 kang2	扛
gang1 kang3 kang4	伉
gang1 kang4	抗
gang1 kang4 keng1	阬
gang1 kong4 qiang1	矼
gang1 nao2	碙
gang3 gou1 kou4	溝
gang3 hong4	港
gang3 kang4	犺
gang4	槓筻
gang4 zhuang4	戆戇
gao1	槔櫜滜篙糕羔韟鷎鼛
gao1 gao3 kao4	槁
gao1 gao4	膏高
gao1 gu1 hao2	皋
gao1 hao4	睾
gao1 jiu4	咎
gao3	杲檺稿縞缟藁
gao3 gao4	筶
gao3 ge2 hao4	浩
gao3 hao1	蒿
gao3 hao4	暠鎬镐
gao3 kao4 qiao1	搞
gao4	勂祰誥诰郜鋯锆
gao4 gu4 ju1	告
ge1	割哥戈歌滒鴐鴿鸽
ge1 ge2	搁擱閤
ge1 ge2 he4 luo4	格
ge1 ge4 luo4	鉻
ge1 gu3 jie2 qi4	扢
ge1 gua1 jia1 ka1 lie4 qia1 ye4 zha2	擖
ge1 ha1 jia1 ke1	鉿
ge1 he2	犵纥菏
ge1 he2 jie2	紇
ge1 ka1 ka3 lo5 luo4	咯
ge1 ke3 ke4	可
ge1 luo4	袼
ge1 qi4	肐
ge1 wu4 yi4	仡
ge1 ya1 zha2	閘
ge1 yi4	圪屹疙
ge2	嗝塥愅搿滆膈觡轕镉閣阁鞷韐騔骼鮯
ge2 ge3	葛
ge2 hai4 he4 xie1	猲
ge2 han2 he2 qin1	頜
ge2 he2	挌颌
ge2 he4	佫
ge2 ji1 rong3	隔
ge2 ji2	革
ge2 jia3	鉀
ge2 jia3 jia4 jie5 xia2 xia4	假
ge2 li4	鎘
ge2 lie4 xie1	獦
ge2 luo4	茖鮥鵅
ge2 qia4	髂
ge2 sa3 ta4	鞈
ge2 ta4 ye4	鎑
ge3	哿舸
ge3 ge4	個各
ge3 he2	合魺
ge4	箇虼铬
ge4 jie4	介
ge4 jie4 xie4	吤
ge4 li4 luo4	硌
gei3 ji3	给
gei3 ji3 xia2	給
gen1	根跟
gen2 hen3	哏
gen3 gen4 hen2	艮
gen4	揯
gen4 geng4	亙
gen4 geng4 xuan1	亘
gen4 hen2	痕
gen4 jian4	茛
geng1	庚浭耕菮賡赓鶊
geng1 geng4	更緪
geng1 lang2	羹
geng3	埂挭梗绠耿郠骾鯁鲠
geng3 jing3	頸颈
geng3 xing2	邢
geng3 ying3 ying4	哽
geng3 ying4	硬
geng4	堩
geng4 heng2	恆
gong1	公功匑塨宫宮工幊弓恭攻肱觥躬龔龚
gong1 gong3 gong4 hong2	共
gong1 gong4	供
gong1 gong4 hong3	愩
gong1 guang1	咣
gong1 hong2	红魟
gong1 hong2 jiang4	紅
gong1 zhong1	蚣
gong3	巩廾拲栱汞珙輁鞏
gong3 gong4 hong3	嗊
gong3 huang2 kuang4	磺
gong3 ju2	拱
gong3 kuang4	礦
gong3 qiong2	蛩
gong4	羾貢贡
gong4 hong2	渱
gong4 hong2 hong4 jiang4	虹
gou1	沟篝簼緱缑钩鞲韝
gou1 gou3	苟
gou1 gou3 ju3 qu2	枸
gou1 gou4	冓勾搆袧
gou1 gou4 gu1 hou1 hou3 xu3	呴
gou1 gou4 ju1 qu2	軥
gou1 gou4 ju4 qu2	句
gou1 gou4 qu2	鉤鴝
gou1 ju1	泃痀
gou1 ju1 ju2 ju3	拘
gou1 ju1 kou4	佝
gou1 kou4 ou1 qiu1 qu1	區
gou3	岣狗笱耇芶
gou3 ju1 qu2	鮈
gou3 qu2 xu4	蚼
gou4	垢够夠姤媾构茩覯觏诟購购遘雊
gou4 hou4	詬
gou4 jiang3	傋
gou4 jue2	構
gou4 kou1	彀
gu1	姑嫴孤柧橭泒箍箛罛菇菰觚軱轱辜酤鮕鴣鸪
gu1 gu2 gu3	骨
gu1 gu3	毂沽蓇蛄轂
gu1 gu3 gu4	盬
gu1 gu4	估
gu1 gu5	咕
gu1 gua1 gua3	呱
gu1 gua1 hu4	胍
gu1 hu2 hu4 huo4	瓠
gu1 jia1 jia4 jia5 jie5	家
gu1 ku1	枯
gu1 pai4	哌
gu1 pi4	鈲
gu2 hu2	鶻
gu3	唃啒尳愲榖榾濲瀔牯瞽穀罟羖股臌薣蛊蛌詁诂钴鼓
gu3 gu4 hu2	鈷
gu3 gu4 ku1	古
gu3 he4 hu2	鵠
gu3 hu2	縎鹄鹘
gu3 hu2 yu4	汩
gu3 hu4	淈
gu3 hu4 ku3	苦
gu3 hua2	滑
gu3 jia3	嘏贾
gu3 jia3 jia4	賈
gu3 jiao3 jue2 lu4	角
gu3 lu4 yu4	谷
gu3 tou2	骰
gu3 ye3	蠱
gu3 ying2	夃
gu4	僱凅固堌崮故棝牿痼稒錮锢顧顾鲴
gu4 hu4	雇
gu4 jue2	梏
gua1	刮劀瓜緺騧鴰鸹
gua1 guo1	聒
gua1 guo1 hua4 huai4 shi4	咶
gua1 huo2	趏
gua1 ji3	颳
gua1 kuo4	括
gua1 kuo4 tian3	栝
gua1 she2	舌
gua1 tian3 xian1	銛
gua1 wan2	捖
gua3	剐剮寡
gua3 guo1 he2 wai1 wo1 wo3	咼
gua4	卦挂掛罣褂詿诖
gua4 guai3 hua4	罫
gua4 kua1	絓
guai1	乖
guai1 guo2	掴摑
guai3	拐枴柺
guai4	怪
guai4 jue2	夬
guai4 kuai4 kuo4 wei4	噲
guan1	倌关官瘝鱞鳏
guan1 guan3 guan4 gun4	琯
guan1 guan3 wan3	莞
guan1 guan4	冠棺觀观
guan1 guan4 gun3 kun1	鰥
guan1 jian1	菅
guan1 jin1 qin2	矜
guan1 lun2	綸纶
guan1 lun2 lun3	淪
guan1 wan1 wan3	關
guan3	痯筦管錧館馆
guan3 wo4	斡
guan4	悹悺惯慣掼摜毌涫爟瓘盥祼罐贯鑵鱹鹳
guan4 guo3	淉
guan4 guo3 luo3	果
guan4 huan1	懽
guan4 huan1 quan2	鸛
guan4 huan2	雚
guan4 huan4	灌
guan4 kuang4	丱
guan4 quan2	權矔
guan4 wan1	婠貫
guang1	垙炚烡珖胱茪銧
guang1 guang3 guang4 kuang4	廣
guang1 guang4	光桄
guang1 guang4 heng2 heng4 huang2 huang4	横
guang1 huang2	趪
guang1 huang2 huang4	潢
guang1 huang3	恍
guang1 huang4	洸
guang3	犷
guang3 jing3	獷
guang3 jiong3	臩
guang4	俇撗
guang4 jiong3	臦
guang4 kuang2	逛
guang4 kuang2 wang4	迋
guang4 kuo4 tang3	擴
gui1	圭妫归摫槻槼珪瑰皈瞡规邽閨闺
gui1 gui3	佹
gui1 gui4	媯茥
gui1 gui4 xu4	規
gui1 he4	硅
gui1 hua2 wa1 wa2 wa5	哇
gui1 hua4 kui2 wa1 xie2	鮭
gui1 huai2	櫰
gui1 hui3	螝
gui1 hui3 kui1	蘬
gui1 hui4 wei3	廆
gui1 juan4 xi1	巂
gui1 jun1 qiu1	龜龟
gui1 kuai4 kui3	傀
gui1 kui2 kui4	歸
gui1 kui2 wei3	隗
gui1 tui2	騩
gui1 wa1	洼窐
gui1 xie2	鲑
gui1 zui1	嫢
gui3	匦匭厬垝宄庪晷湀癸祪簋蛫蟡觤詭诡軌轨鬼
gui3 gui4	庋
gui3 jiu3 qiu2	氿
gui3 qi2	祈
gui3 qiu2	朹
gui3 wa2	姽
gui3 wei2	桅
gui4	刽刿劊劌撌桂槶櫃禬筀貴贵跪鳜
gui4 guo2	簂
gui4 hui4	桧繪襘
gui4 hui4 kuai4	檜
gui4 hui4 wei3	硊
gui4 jiong3	昋炅
gui4 ju3	柜
gui4 jue1 jue2 jue4	撅
gui4 jue2	嶡赽趹鱖
gui4 jue2 jue3	蹶
gui4 jue2 kui4	觖
gui4 kui4	匮匱鐀
gui4 kui4 wei4	瞶
gui4 que1 xue4	炔
gui4 wa1 wa2	娃
gui4 wei1	癐
gui4 yan4	溎
gun3	丨惃滚滾磙绲蔉衮袞輥辊鯀鲧
gun3 hun2 hun4	渾緄
gun3 hun2 hun4 kun1	混
gun3 juan3 juan4 jun4 quan1 quan2	卷
gun3 kun1	錕
gun3 yuan1	裷
gun3 yun4	緷
gun4	璭
gun4 huan2 lun3	睔
guo1	呙嘓埚墎崞彉瘑蝈锅
guo1 guo2	郭
guo1 guo3	鍋鐹
guo1 guo4	过
guo1 guo4 guo5 huo4	過
guo1 huo2	活
guo1 kuang4	矌
guo1 wo1	堝涡渦濄
guo1 yu4	蜮蟈
guo2	国國帼幗慖漍聝蔮虢
guo2 hao2 hu3 xia4 xiao1	唬
guo2 huo4	膕
guo2 wei2	囗
guo2 xu4	馘
guo3	惈椁槨裹褁
guo3 guo4 hua2 hua4 huai5	划
guo3 hua4	粿
guo3 hua4 hui4	輠
guo3 ke4 kua3	錁
guo3 luo2 luo3	蠃
guo3 luo2 wo1	蝸
guo3 luo3	猓蜾
ha1	铪
ha1 ha3 ha4 he1 he2 sha4 ta4	哈
ha2 jia3 xia1	蝦
ha2 xia1	虾
ha3 jie3 xie4	獬
ha4 he4 xia4	吓
hai1 hei1	嗨
hai1 tai1	咍
hai2	孩
hai2 huan2 xuan2	還
hai2 hui1	咴
hai2 ke1 ke2	頦
hai3	海烸醢
hai3 li3	浬
hai4	嗐氦餀駭駴骇
hai4 he2	害
hai4 jie1	亥
hai4 jie4	妎
han1	哻憨谽顸鼾
han1 han2	蚶魽
han1 han4	酣
han1 lian3	歛
han1 nan3	嫨
han2	函唅寒嵅晗梒焓琀甝蜬邗鋡韓韩
han2 han4	含涵邯
han2 han4 qian2	馯
han2 han4 qin2	肣
han2 han4 yan1 yan3	淊
han2 jian1	椷
han2 qian2	鈐
han3	鬫
han3 han4	罕蔊
han3 jian1 kan4	喊
han3 jian1 xian3 xian4 xuan1	軒
han3 kan4	阚
han3 kan4 qian4	嵌
han3 kan4 xian4	闞
han3 lan4	嚂
han4	悍撼旱暵汉涆瀚焊睅翰菡蜭螒銲鋎雗頷顄颔駻鶾
han4 huan4	澣
han4 jian1 kan1 qian2	靬
han4 nan4 tan1	灘
han4 qian3	撖
han4 qian3 qin4 yan3	顩
han4 ran3	熯
han4 tan1	漢
han4 xian4	譀
hang1 kang4	炕
hang2	斻絎绗航苀蚢貥颃魧
hang2 hang4	笐
hang2 hang4 heng2	桁
hang2 hang4 heng2 xing2 xing4	行
hang2 hang4 kang4	沆
hang2 hang4 keng1	吭
hang2 heng2	珩
hang2 kang1 kang4	杭邟
hang2 xiang2	迒
hang3 hen3 ken3 yan2	狠
hang3 lang2 lang3 lang4	狼
hang4 xiang4	巷
hao1	嚆薅
hao1 kao3	薧
hao1 kou4 xiu1	茠
hao1 nou4	鎒
hao2	嗥嚎壕毫濠籇蠔譹豪
hao2 hao4	號
hao2 hao4 xiao1	号
hao2 he2 ma4 mo4	貉
hao2 huo4 xia4	諕
hao2 jiao1 jiao3 nao3	膠
hao2 xiao1	呺
hao3 hao4	好
hao3 shi4	郝
hao4	哠昊昦淏澔灏灝皜皞薃顥颢鰝
hao4 he4	翯
hao4 he4 xiao1	藃
hao4 hui1	皓
hao4 jiao1 qiao1	鄗
hao4 jiao4	悎
hao4 mao2 mao4	耗
hao4 mao4	秏
hao4 niu1	妞
hao4 xue4	滈
he1	嗬訶诃
he1 he2 he4	荷
he1 he4 kai4 ye4	喝
he1 ke1	苛
he1 xia2	欱
he2	姀峆敆楁河涸渮澕熆盉禾篕籺覈鉌鑉闔阂阖麧齕龢
he2 he4	何鶡
he2 he4 hu2 huo2 huo4 huo5	和
he2 huo4	藿
he2 jiao3 jiao4 zhuo2	繳
he2 jie1 qi4	揭
he2 jie2 kai4 ke3	渴
he2 kai4	劾
he2 ke1 ke4 xia2	嗑
he2 ke3	盍
he2 ke4	蚵
he2 li4	翮
he2 lu4 ya4	輅
he2 mo4 she2	鞨
he2 qia4	洽
he2 xia2	螛轄郃
he2 xie1	蝎
he4	煂褐賀贺鶴鹤
he4 hu1 xia4 xiao1 xu1	呼
he4 hu4 xiao1 xiao4	嗃
he4 huo4	壑
he4 huo4 suo3	霍
he4 kai4 qi4	愒
he4 kao3 kao4 xiao1	熇
he4 shi4	赫
he4 xi4	鬩
he4 xia4	嚇
he4 xiao1	謞
hei1	潶黑
hei1 mo4 mu4	嘿
hen1 xin1	噷
hen2	拫鞎
hen2 xian1	掀
hen3	很
hen3 heng2	佷
hen4	恨
heng1	哼脝
heng1 hong1 jun4	訇
heng1 peng1 xiang3	亨
heng2	姮恒橫烆胻蘅衡鑅
heng2 huan2 xuan1	狟
hong1	嚝灴烘焢薨輷轟轰鍧
hong1 hong2 ju1 xuan4	揈
hong1 hong3 hong4	哄
hong1 hou3 ou1	吽
hong1 long2	谾
hong1 qing4	渹
hong1 rong2 ying2	巆
hong1 xiong1	哅
hong1 ying1 ying2	謍
hong2	仜吰妅宏弘彋汯泓洪浤玒竑竤紘翃耾苰荭葒谹谼鈜鋐閎闳霐霟鞃鸿黉黌
hong2 hong4	蕻鴻
hong2 huang2	篊
hong2 jiang4	洚
hong2 qiong2	舼
hong2 wang1 wang3	汪
hong2 xiang2	瓨
hong4	澋澒訌讧闀
hong4 xiang4	鬨
hou1 ku4	齁
hou2	喉猴瘊篌糇翭葔鄇鍭餱骺鯸
hou2 hou4	侯
hou2 qu2	翵
hou2 xiang4	銗
hou3	吼
hou4	候厚后垕堠後洉逅郈鱟鲎
hu1	乎匢唿垀寣忽惚昒曶歑淴烀虍轷
hu1 hu2 hu4	糊虖
hu1 hu3	滹
hu1 hu4	雽
hu1 hui1 suo1 xi1 xi4 yi1	戲
hu1 hui4	芔
hu1 mei2 wu3	膴
hu1 wu2	幠
hu1 wu4	芴
hu1 xi4	戏
hu1 xiao1	謼
hu2	嘝囫壶壺媩弧抇斛楜槲湖瀫焀煳狐猢瑚縠胡葫蝴螜衚醐餬鬍鰗鶘鶦鹕
hu2 hu4	沍魱
hu2 hua2 wu2	鋘
hu2 jue2 que4	觳
hu2 ku1	搰
hu2 que4	礐
hu2 tie3	鴩
hu2 zhi2	瓡
hu3	琥
hu3 hu4	虎
hu3 huang3	汻
hu3 xu3	浒滸許许
hu4	互冱嗀婟嫭嫮岵戶户戽扈护昈枑槴沪滬熩祜綔蔰護鄠鍙韄頀鹱
hu4 huo4	濩穫
hu4 huo4 wo4	擭
hu4 ku3	楛
hu4 kua1	姱
hu4 lu2 lu3	芦
hu4 tie1	怙
hu4 wen3 wu4	笏
hu4 wu1	洿
hu4 xia4	芐
hu4 xue2	觷
hu4 yu3	羽
hua1	花蘤錵
hua1 hua2	哗嘩
hua1 hua2 hua4	华
hua1 hua2 hua4 kua1	華
hua1 hua4 huo4	化
hua1 huo4 xu1	砉
hua2	猾螖鏵铧驊骅鷨
hua2 hua4 huai5	劃
hua2 hui4 kuai4	澮
hua2 huo1 huo4	劐豁
hua2 huo2	姡
hua2 jiao4 xue2	學
hua2 kuai4	獪
hua2 qia1 xia2	搳
hua2 wa4	譁
hua2 wu1	釫
hua2 yu2	釪
hua2 zhao3	找
hua4	嫿嬅崋摦杹桦槬樺澅画畫繣話諙话
hua4 huo4	檴
hua4 ke1	稞
hua4 xie4	觟
huai2	懷槐淮蘹褢褱踝
huai2 huai4 hui4	壞
huai2 hui2	佪徊
huai2 wai1	瀤
huai4	蘾
huai4 kui4	喟
huai4 pei2 pi1	坏
huai4 pi1	坯
huan1	欢歡驩鴅
huan1 huan2	貆
huan1 huan4	嚾讙
huan1 quan1	酄
huan1 quan2	獾
huan1 xuan1	懁
huan1 yi4 yu4	欥
huan2	峘桓洹环繯缳羦荁豲鍰锾闤雈鬟
huan2 huan4	環轘
huan2 huan4 wan4	綄
huan2 qiong2	瞏
huan2 qiong2 xuan1 xuan2	嬛
huan2 wan2	汍
huan2 xian4	寰
huan2 xuan4	澴鐶
huan2 xun2	郇
huan2 yan3 ye4	瓛
huan2 yuan2	圜蒝
huan2 yuan4	垸瑗
huan2 zhui1	萑
huan3	攌緩缓
huan3 huan4	睆
huan4	唤喚奂奐宦幻患换換浣渙漶焕煥瑍瘓肒豢逭鯇鲩
huan4 hui4	涣
huan4 hun4	圂
huan4 juan3 xuan1	擐
huan4 juan4 xuan4	眩
huan4 quan2	蠸
huan4 tuan3	痪
huan4 wan3	皖脘
huan4 yuan2	援
huang1	巟肓衁
huang1 huang2 huang3 kang1	荒
huang1 huang3 huang5	慌
huang1 huang3 mang2 wang2	芒
huang2	偟凰喤堭媓崲徨惶楻煌獚璜癀穔篁簧艎葟蝗蟥諻遑鍠隍餭騜鰉鳇鷬黃黄
huang2 huang3	熿
huang2 kuang4	湟
huang2 wang3	皇
huang2 ying1	韹
huang2 yong2	揘
huang3	幌怳炾謊谎
huang3 huang4	晃
huang3 kuang3 kuang4	爌
huang3 mang2	茫
huang3 ye4	熀
huang4	榥滉皝鎤
hui1	噅徽恢拻挥晖暉楎洃灰禈翬蘳詼诙豗輝辉隳鰴麾
hui1 hui3	虺
hui1 hun2	揮珲琿
hui1 hun2 xuan4 xun1 yun4	煇
hui1 sui1 wei3	睢
hui1 sui1 wei4 xie2	眭
hui1 wei2	撝
hui1 wei3	椲煒
hui1 xi1	鑴
hui1 yi1	褘
hui2	回恛痐茴蛔迴
hui2 hui4	洄繢藱
hui2 hui4 you2	蚘
hui2 wei2	違韋
hui3	悔檓毀毇燬譭
hui3 hui4	毁
hui3 xuan1 xuan3	烜
hui4	匯卉嘒圚彙徻恚惠慧憓晦槥橞檅汇潓烩燴獩瞺秽穢绘缋翽荟蔧蕙薈薉蟪誨諱譓譿讳诲賄贿鐬闠顪餯
hui4 huo4 wei4	濊
hui4 kuai4	会浍璯
hui4 kuai4 kuo4	會
hui4 kui4	溃
hui4 lei3	瘣
hui4 mei4	沬
hui4 rui4 sui4	鏸
hui4 sou1	蒐
hui4 sui4	彗篲
hui4 xie2	孈
hui4 xu4	銊
hui4 yue3	哕噦
hui4 zhou4	喙
hun1	婚棔睧睯閽阍
hun1 hun3 men4	惛
hun1 hun4	昏涽
hun1 men4	殙
hun1 mian4 min3	湣
hun1 xun1	焄荤葷
hun2	浑繉轋馄魂鼲
hun2 hun4	溷
hun2 hun4 wen4	顐
hun2 kuan3	梡
hun2 kun1	餛
hun2 kun1 kun4	昆
hun2 kun3	捆梱
hun2 mian2 min2 min3	緡
hun2 yun4	餫
hun2 zhuang1	湷
hun4	倱慁掍觨諢诨
hun4 yun2	眃
huo1	吙耠锪騞
huo1 huo3	火
huo1 huo4 o3 wo4	嚄
huo1 huo4 que4	攉
huo1 que4	搉
huo2	佸秮
huo2 kuo4	萿
huo2 yue4	越
huo3	夥鈥钬
huo3 huo4 kuo4	漷
huo3 huo5	伙
huo4	惑曤沎湱瀖獲眓矐祸禍臛获謋貨货鑊镬
huo4 sui3 suo3	靃
huo4 xu4	掝
huo4 xue4	嚯
huo4 yu4	或
huo4 yue4	蠖
huo4 zhi1	隻
huo4 zhuo2	篧
ji1	乩击刉剞勣嘰基墼屐枅機毄玑璣畿癪矶磯積笄箕簊績羁羇羈芨虀譏讥赍跡跻蹟躋銈錤鑇隮雞鞿飢饥鸄鸡齎齏齑
ji1 ji2	庴汲
ji1 ji2 jie2	圾
ji1 ji2 qi1 qi4	緝
ji1 ji3	几虮
ji1 ji3 ji4 qi2	幾
ji1 ji3 qi1 yi3 yi4	踦
ji1 ji4	妓櫅绩肌諅迹
ji1 ji4 jian3 qi2 zhai1 zi1	齊
ji1 ji4 qi2	其懠禨踑
ji1 ji4 xi2	擊
ji1 jiao1 jiao4	激
ji1 jiao3	憿
ji1 jiao4	叽
ji1 jie2	唧
ji1 ju1	居
ji1 li4	苙
ji1 luan2	脔
ji1 qi1	攲期缉
ji1 qi2	丌棋畸稘萁鄿鐖饑
ji1 qi2 qi3	觭
ji1 qi2 qi3 qi4 zhi1	跂
ji1 qi2 qin2	蘄
ji1 qi3	敧稽
ji1 qia4 xi1	咭
ji1 qiao4 yao1	撽
ji1 wei4	机
ji1 xi1	谿
ji1 xi2	嵇
ji1 yi1	犄
ji1 yi1 yi3	倚
ji1 yi2	姬
ji1 zhi3	积
ji2	佶偮即及吉塉姞嫉岌嶯彶忣急戢揤极棘楫槉橶殛湒潗疾瘠笈級级膌蒺蕀螏襋觙谻蹐躤輯轚辑銡鏶集霵鶺鷑
ji2 ji3	嵴極脊
ji2 jie1	秸
ji2 jie2	尐洁蝍诘趌鞊
ji2 jie2 kuai4	狤
ji2 jie4	籍耤藉
ji2 ju2 zi2	蓻
ji2 ju4 qu2	瞿
ji2 ju4 zu1	蒩
ji2 la4 qu4 zha4	蜡
ji2 qi4	亟
ji2 qi4 que4	踖
ji2 qie4	蕺
ji2 sha4	濈
ji2 yi1	揖
ji2 zhi4	楖郅
ji2 zi3	吇
ji2 zuo2	莋
ji3	丮妀戟挤撠擠泲魕麂
ji3 ji4	济穖紀纪
ji3 ji4 qi2	濟
ji3 qi2	蟣
ji3 qi3	己
ji3 yi3	掎蟻
ji4	冀剂劑哜季寂寄彐徛忌悸惎懻旡暩檕洎漃漈瀱痵癠穄穊繼继罽臮芰茍蓟薊蘮蘻裚覬觊計記誋计记跽际際霁霽驥骥鯚鰶鰿鱀鱭鲚鲫鵋齌
ji4 jie1 jie2	結
ji4 jie1 zhai1	嚌
ji4 jie2	訐髻
ji4 jie2 jie4	紒
ji4 jie2 qi4	偈
ji4 jie4	暨
ji4 kou4	瞉
ji4 kui2 kui4	睽
ji4 qi2	技荠騎鬾齐
ji4 qi2 qi4 zhi4	伎
ji4 qi4	蟿
ji4 shi2 ti2	姼
ji4 xi4	塈既系繫蔇
ji4 ze4	稷
ji4 zei2	鯽
ji4 zhai4	瘵祭
ji4 zhi1	汥
ji4 zi1	璾齍
ji4 zi4	穧
jia1	佳加嘉抸梜毠泇浃犌猳珈痂笳耞袈豭貑跏鎵镓麚
jia1 jia2 jie2 qia1	袷
jia1 jia2 xie2	裌
jia1 jia3	椵
jia1 jia4	枷駕
jia1 qie2	茄
jia1 xia2	浹葭
jia1 xiang4	傢
jia1 xie2	挟挾
jia1 xie4	迦
jia2	扴荚莢蛱蛺郏郟鋏铗頰颊鴶鵊
jia2 jia3	岬
jia2 jie2	拮跲
jia2 jie2 qi4 qia4 xie2	絜
jia2 jie2 xie2	頡
jia2 jie4 xie4	骱
jia2 kai1	揩
jia2 qi4	恝
jia2 qi4 qia4 qie4 shi4	挈
jia2 qian3	唊
jia2 qie4 ya4	猰
jia2 xie1 xie2 xie4	揳
jia3	婽斝榎檟玾甲胛钾
jia3 xia1	瘕
jia3 xia2	徦柙
jia3 xia2 xia4	暇
jia3 xia2 ya1	押
jia3 xia4	夏
jia4	嫁幏架稼驾
jia4 jie4 jie5	价
jia4 jie5 qia3	價
jia4 luo4	駱
jian1	兼坚堅姦尖惤戋歼殲瀸熞熸牋猏瑊礛笺箋緘縑缄缣艰艱菺葌蒹蕑虃豜鞯韉鰹鲣鵳鹣麉
jian1 jian3	籛
jian1 jian3 jian4	煎間
jian1 jian3 jian4 xian2	閒
jian1 jian3 qian1	揃
jian1 jian3 qian2	犍
jian1 jian3 san4	帴
jian1 jian3 xian2	咸
jian1 jian3 yan2 yan4	趼
jian1 jian4	渐溅监鋻间鞬
jian1 jian4 kan4	監
jian1 jian4 qian2 zan4 zhan3	湔
jian1 jian4 shan1	蔪
jian1 jian4 zan4	濺
jian1 ju1 ju3 ju4 zu3	沮
jian1 lian2	搛
jian1 qian1	幵鑯鶼
jian1 qian1 zhan1	鳽
jian1 qian2	黚
jian1 qian3	浅
jian1 qian4	傔鰜
jian1 shan1	櫼
jian1 xian1	攕纖
jian1 xian2	肩
jian1 zhan1	餰
jian1 zhen1	籈
jian3	俭儉减剪戩戬拣挸捡揀枧柬检檢減湕瑐睑瞼硷笕简簡繭翦藆裥襉襺謇譾谫蹇鬋鰎鹼
jian3 jian4	楗锏
jian3 jian4 qian2	揵
jian3 kan3 xian2	堿
jian3 lan2	暕
jian3 lian4	撿
jian3 nan1 yue4	囝
jian3 qian1	騫
jian3 qian2	前錢
jian3 xian2	碱鹹
jian3 xian3 yan2	險
jian3 xian4	涀筧
jian3 zhan3	橏
jian3 zhen1	箴
jian3 zuan1	劗
jian4	俴健剑劍寋建毽涧澗牮珔箭糋舰艦荐薦諓谏賤贱践踐踺轞鉴鍵鑑鑒鑳键餞饯
jian4 jin4	榗
jian4 kan3	槛檻
jian4 lan2 lan3 lan4	濫
jian4 lan4	諫
jian4 lian4	鍊
jian4 mou2	件
jian4 qian1	鐱
jian4 qian2	腱葥
jian4 qian4	塹
jian4 tie3	僣
jian4 xian2	瞷
jian4 xian4	見见
jian4 zen4	僭譖
jian4 zun4	栫瀳袸
jiang1	僵姜橿殭江礓缰翞茳薑螿豇韁
jiang1 jiang3	槳蔣
jiang1 jiang3 jiang4 qiang1 yang2	將
jiang1 jiang4	浆漿疆糨
jiang1 jiang4 qiang1	将
jiang1 jiang4 qiang2 qiang3	彊
jiang3	奖桨獎耩膙蒋講讲顜
jiang4	匠嵹弶犟絳绛袶謽酱醬
jiang4 qiang2 qiang3	強强
jiang4 xiang2 xiang4	降
jiao1	交娇嬌嶕憍椒浇礁穚簥膲蛟蟭郊鐎骄鮫鲛鷦鷮鹪
jiao1 jiao2 jiao3	矯
jiao1 jiao3	儌
jiao1 jiao3 jiao4	僬
jiao1 jiao3 jiao4 qiao1 qiao2	橋
jiao1 jiao3 jiao4 yao1	徼
jiao1 jiao3 jiu1 jiu4 qiu1	湫
jiao1 jiao3 kao3	撟
jiao1 jiao3 xiao2	佼姣
jiao1 jiao3 yao1 yao3	咬
jiao1 jiao3 yao2	僥
jiao1 jiao4	挍教
jiao1 jiao4 jiu1	噍
jiao1 ju1 qiao2 xiao1	驕
jiao1 jue2 qiao2 zhuo2	燋
jiao1 liao2	嵺
jiao1 qiao1	跤
jiao1 qiao1 qiao2	蕉
jiao1 qiao1 xiao1	骹
jiao1 qiao2	嫶焦蕎
jiao1 qiao4 xiao4	茭
jiao1 qiu1	萩
jiao1 qiu2	艽
jiao1 shu1	菽
jiao1 xiao1	憢鵁
jiao1 xiao2	胶
jiao1 xiao3	轇
jiao2 jiao3	矫
jiao2 jiao4 jue2	嚼
jiao3	挢搅攪敿曒灚煍皎皦笅绞鉸铰饺鱎
jiao3 jiao4	餃
jiao3 jiao4 qiao1	敫
jiao3 jiao4 qiao1 xiao4	校
jiao3 jiao4 qiao2	潐
jiao3 jiao4 xiao2	筊絞
jiao3 jiu1	糾
jiao3 jiu1 liao2 liu2 nao2	摎
jiao3 ju2 jue1 jue2 qiao1 xue4	蹻
jiao3 jue2	脚腳
jiao3 ku4	捁
jiao3 po4 xiao3	皛
jiao3 qiao2	僑喬蟜
jiao3 qiao4	譑
jiao3 que4 xi4	卻
jiao3 xiao4	恔狡
jiao3 yan4	敥
jiao3 yao1	妖
jiao3 yao2	侥
jiao3 zhuo2	缴
jiao4	叫嘂嬓斠滘獥珓皭譥趭轎轿较酵釂
jiao4 jue2	爝覺觉
jiao4 jue2 xiao4	較
jiao4 liao2 liu4 pao4	窌
jiao4 qiao2	峤嶠
jiao4 qiao2 zhan4	醮
jiao4 zao4	窖
jiao4 ze2 zhuo2	灂
jie1	疖痎癤皆蝔街阶階鞂
jie1 jie2	節结节
jie1 jie2 qie4	椄
jie1 jie3 kai3	鍇
jie1 jie4	鶛
jie1 jie4 jue1	嗟
jie1 jie4 kai3	楷
jie1 ju1	罝
jie1 sha4	菨
jie1 xie2	偕湝
jie1 xie4	喈
jie1 zha1 zha3 zu3	謯
jie1 zu3	祖
jie2	傑劫劼卩孑岊崨嵥巀幯截昅杰桀楶榤滐潔竭羯蠽衱袺詰讦踕迼鉣鍻鲒
jie2 ju2 xie2	桔
jie2 ke3	嵑
jie2 ke3 ya4	碣
jie2 qi1 qie4	蛣
jie2 qi4 qie4 xie4	契
jie2 qia4	楬鮚
jie2 qian3 qu1	脥
jie2 qie4	倢婕洯疌
jie2 she4	睫
jie2 xie2	颉
jie2 zhi4	擳
jie3	媎
jie3 jie4 xie4	解
jie3 ju4	袓
jie3 ju4 xu4 zu1	姐
jie3 xie4	檞
jie4	借屆届岕戒犗玠界疥砎蚧蛶褯誡诫
jie4 ke4	悈
jie4 ke4 zong1	艐
jie4 qian1	雃
jie4 she4 shi2	拾
jie4 xie4	嶰
jie4 ze2	唶
jin1	今堻巾惍斤津珒襟觔钅
jin1 jin4	濜璡禁紟金
jin1 le1 le4 lei4	肋
jin1 le4	竻
jin1 qian2	筋
jin1 qin1 qin2	菳
jin1 qin2	埐嶜
jin1 qin4	衿
jin1 yin2 yin3	釿
jin3	卺巹紧緊菫蓳謹谨錦锦饉馑
jin3 jin4	僅儘尽瑾盡
jin3 jin4 qin2	堇慬
jin3 qian1	婜
jin3 qin2	廑斳槿
jin3 tian3 zhen3	紾
jin4	僸噤嚍嬧寖搢晉晋枃殣溍烬煡燼璶祲縉缙荩藎覲觐賮贐赆近进進靳
jin4 jing4	劲勁
jin4 qian1 qin1 qin3	鋟
jin4 qin1	浸
jin4 qin2	墐
jin4 xian1	妗
jin4 xian1 yan3	嬐
jin4 yin2	伒
jin4 yin2 yin3	吟
jin4 zhi1	臸
jing1	京兢婛旌旍晶泾粳腈茎荆荊菁驚鲸鵛鶁麠鼱
jing1 jing3	睛
jing1 jing4	徑經经
jing1 jing4 qing2	殑精
jing1 liang2	惊
jing1 qian2	仱
jing1 qiang1 qing4	箐
jing1 qing1	蜻青鶄
jing1 qing2	鯨
jing1 qing3	涇
jing1 shi4 zhi1	氏
jing1 xing2	巠
jing1 xing2 xing4	鋞
jing1 ying1	莖
jing3	儆刭剄幜憬暻汫璟璥肼蟼警阱
jing3 jing4	井憼
jing3 jing4 qing2	擏
jing3 ting1	烴
jing3 ying3	景
jing4	凈境婧弪弳径敬桱獍痉痙竞竟竫競胫迳逕鏡镜靖静靜
jing4 keng1	脛
jing4 liang2	靚
jing4 liang4	倞靓
jing4 qing1 qing4	靘
jing4 qing2	檠葝
jing4 xing2	陘
jing4 ying2	俓
jiong1	坰駉
jiong1 jiong3	冂冏扃浻絅
jiong1 jiong3 xian4 xuan3	顈
jiong1 jiong3 ying2 ying3	泂
jiong1 ke1 ke3	坷
jiong1 shang3	垧
jiong1 ying2 ying4	瀅
jiong3	囧炯煚熲燛窘褧迥
jiong3 xing2 ying2	熒
jiong3 ying1 ying2	鎣
jiu1	勼啾揪揫朻纠萛阄鬏鬮鸠
jiu1 jiu3	九
jiu1 jiu4	救究赳
jiu1 le4	牞
jiu1 liao2	樛
jiu1 liao2 liao3 liao4 lu4 miao4 miu4 mou2 mu4	繆
jiu1 lu4	穋
jiu1 qiu2 you2	蝤
jiu1 qiu2 zhi4	鳩
jiu1 you2	揂
jiu3	久灸玖酒韭
jiu4	僦厩就廄慦旧柩桕殧疚臼舅舊鷲鹫麔
jiu4 ju1 qiu2	捄
ju1	匊娵崌挶掬梮椐涺狙琚腒蜛踘陱雎驹鶋
ju1 ju2	鋦锔
ju1 ju3	疽
ju1 ju3 qu1 zu3	岨
ju1 ju4	俱据裾鋸锯駒
ju1 ju4 zu1	菹
ju1 jue2	臄
ju1 qie4	趄
ju1 qiong1 qu1	鞠
ju1 qu1	蛆鞫
ju1 qu3 shu1	娶
ju1 xu1	揟
ju1 yu4 zhou1	鬻
ju1 zu1	砠租
ju2	侷局椈橘淗湨焗犑狊菊蘜輂郹閰駶驧鵙鵴鶪鼰
ju2 jue2	趉
ju2 jue2 qu1 que4	屈
ju2 qiu2 qu1	趜
ju2 qu4	跼
ju2 xi2	鼳
ju2 yu4	僪
ju3	举椇榉榘櫸矩筥舉莒蒟踽龃
ju3 ju4	拒
ju3 qu2	籧
ju3 yu3	萭
ju3 zha1	齟
ju3 zou1	郰
ju3 zui3	咀
ju4	倨具剧劇埧壉姖屦屨岠惧懅懼據洰澽炬犋秬窭粔耟聚虡蚷詎讵豦距踞躆醵鉅钜颶飓駏
ju4 kou4	怐
ju4 liu3 lou2 lv3	蔞
ju4 lou2	窶
ju4 lou2 lv4	寠
ju4 lou3 lv3	簍
ju4 qie3 qie4 qu1 zhu4	跙
ju4 qu2	巨渠蘧螶遽鐻
ju4 qu3	苣
ju4 yu2	貗
ju4 zou1	鄒鄹
ju4 zu2	足
ju4 zu3	珇
juan1	娟蠲裐鐫镌鵑鹃
juan1 juan3 juan4 quan1 quan2	圈
juan1 juan4 xuan1	鋗
juan1 jun4 suo1	睃
juan1 shen1	身
juan1 xie2 xuan1	梋
juan1 xuan2 xuan4	泫
juan1 xuan4	鞙
juan1 xuan4 yuan4	涓
juan1 ye4 yuan1 yue4	焆
juan1 yuan2	捐
juan1 zui1	朘脧
juan3	臇菤錈锩
juan3 juan4	帣
juan3 juan4 quan2	捲
juan3 quan2	埢蜷踡
juan3 rui3	蕊
juan4	倦狷獧眷睊睠絭绢罥鄄
juan4 jun4	蔨隽
juan4 jun4 zui4	雋
juan4 kui4 quan1 quan2	腃
juan4 quan1	弮桊
juan4 quan1 quan2	棬
juan4 quan2	婘惓
juan4 quan4	韏
juan4 xuan4	絹
juan4 yan3	萒
juan4 yuan1	悁
juan4 zhen1 zhen4	甄
juan4 zhuan4	縳
jue1	噘屩
jue1 qiao1	繑
jue2	决劂匷厥孓彏憰戄抉攫桷橛殌爵獗玃玦玨珏瘚矍絕绝芵蕨虳蟨觼訣譎诀谲貜鈌钁镢鴃鷢
jue2 jue4	倔
jue2 ku1	掘
jue2 kuai4	駃
jue2 kuang2	狂
jue2 kui2	騤
jue2 kui2 que4	闋
jue2 qi4	躩
jue2 qiong2	璚
jue2 qu1	鶌
jue2 qu2	蠼
jue2 que1	蚗
jue2 que1 que4	闕
jue2 que1 xue4	決
jue2 que4	傕埆
jue2 shu4 yu4	潏
jue2 wa1	蛙
jue2 xu4 yu4	矞
jue2 xue2	噱穴
jue2 xue4	泬
jue2 yi3 yi4	乙
jue2 yu4	崛繘鐍
jue2 zhuo1	穱
jue2 zhuo2	捔
jue2 zhuo2 zui4	蕞
jue2 zui4	蕝
jun1	军君桾皲皸碅莙蚐袀軍鈞鍕钧鮶
jun1 jun4	菌
jun1 qun2	麇
jun1 xun2	旬
jun1 yun2	筠鋆
jun1 yun2 yun4	匀
jun1 yun4	均
jun4	呁寯峻捃晙棞燇珺畯竣蜠郡餕駿骏鵔鵘
jun4 qu1	焌
jun4 qun1	箘
jun4 suan1 xun4	狻
jun4 sui1 suo3	葰
jun4 tui1 tun1	焞
jun4 xun4	濬
ka1 ka3 nong4	咔
ka1 ke4 ke5	喀
ka1 qu4	呿
ka3	佧胩鉲
ka3 qia3	卡
kai1	开锎
kai1 qian1	開
kai3	凯凱剀垲塏恺愷慨暟蒈鎧铠锴闓颽
kai3 kai4	輆
kai3 qi3	岂豈
kai3 si4 yi3 zhi4	雉
kai4	勓烗鎎
kai4 ke4	溘
kai4 qi4	忾
kai4 qi4 xi4	愾
kai4 xi4	欯
kan1	刊勘龛
kan1 kan4	看
kan1 ke4	龕
kan1 zhan4	嵁
kan1 zhen3	戡
kan3	侃砍莰轗
kan3 kan4	坎竷衎
kan3 ke4 qian3	歁
kan3 qian3	凵
kan3 sun3 zhi4	扻
kan3 xian4	埳
kan3 yan4	顑
kan4	墈崁瞰矙磡
kan4 lian3 xian1 yan2	薟
kan4 xian4	餡
kang1	嫝慷漮糠鏮
kang1 kang4	康闶
kang2	摃
kang4	匟囥鈧钪閌
kang4 keng1	坑
kao1	尻
kao1 qiu2	訄
kao3	拷攷栲烤考
kao3 kao4	洘
kao4	犒銬铐靠
ke1	嵙柯榼樖牁犐珂瞌窠薖蝌趷軻鈳钶颗
ke1 ke2	颏
ke1 ke3	磕轲
ke1 ke3 kuan3	棵顆
ke1 ke4	科
ke1 kua4	髁
ke1 luo3	砢
ke1 zhua1	簻
ke2	翗
ke2 qiao4	壳殼
ke3	岢嶱敤
ke4	克勀堁恪氪緙缂課课锞騍骒
ke4 kei1	刻剋
ke4 ku4 que4	硞
ke4 qia1 qia4	愘
ke4 qia4	客
ken3	啃墾恳懇肯錹
ken3 kun1	豤
ken3 kun3 qian3 yin2	齦
ken3 qi2	頎
ken3 yin2	垦龈
ken4	掯裉
ken4 keng1 xian4 yin2 yin3	硍
ken4 yin2	垠
keng1	挳牼誙銵鍞鏗铿
keng1 keng3	硻
keng1 qing4	硜
keng1 xing2	硎
keng3 tan3	忐
kong1	崆箜錓
kong1 kong3	倥悾
kong1 kong3 kong4	空
kong1 kong4	硿
kong1 kong4 qiang1	控
kong1 nang2	涳
kong1 qiang1	椌
kong1 qiong1 qiong2	穹
kong3	孔恐
kong4	鞚
kong4 qiang1	腔
kou1	彄抠眍芤
kou1 ku1	刳
kou1 ku1 kua4	挎
kou1 ou1	摳鏂
kou1 ou1 qu1	毆
kou1 yu3 yu4	嫗
kou3	口
kou3 qu3	竘
kou4	叩寇扣滱筘簆蔻釦鷇
ku1	哭堀桍窟跍骷
ku1 qia4	矻
ku1 sheng4	圣
ku1 zhu2	泏窋
ku3	狜
ku4	喾嚳库庫瘔绔裤褲酷
ku4 kua1 kua3 kua4	跨
ku4 wu1	趶
kua1	舿
kua1 kua3 kua4	夸
kua1 qu4	誇
kua1 xu1	晇
kua3	垮銙
kua3 kua4	胯
kua3 kui1	顝
kua4	骻
kuai3 kuai4	蒯
kuai4	侩儈哙塊廥快旝狯筷脍膾郐鄶鱠
kuai4 kui2 kui3	魁
kuai4 kui4	蕢
kuai4 kuo4	鬠
kuai4 yue2	块
kuan1	宽寬臗髋髖
kuan1 wan2	完
kuan3 xin1	款
kuang1	劻恇洭筐誆诓
kuang1 kuang2 kuang4	框
kuang1 qiang1	哐
kuang1 wang1	匡
kuang2	狅誑诳軠鵟
kuang2 wang3	枉
kuang3	夼懭
kuang3 kuang4	壙
kuang4	况圹旷曠況眶矿穬絖纊纩貺贶軦邝
kuang4 kuo4	鄺
kuang4 xiong1	兄
kui1	刲岿盔窥聧虧闚
kui1 kui3	窺
kui1 kui4 wei3	巋
kui1 li3	悝
kui1 yu2	亏
kui2	喹夔戣揆暌楏楑櫆葵藈蝰躨鄈鍷頄頯
kui2 kui3	奎逵
kui2 qiu2	馗
kui2 rao2	犪
kui3	煃蹞頍
kui3 qing1 qing3	頃
kui3 que1	缺
kui3 wei3	磈
kui3 xie4	跬
kui4	嘳嬇愦愧憒樻欳篑簣聩聵蒉餽馈
kui4 tui2	饋
kui4 xie4	潰
kui4 yong3 yu2 yu3	臾
kun1	坤崑晜焜猑琨菎褌醌锟騉髡鯤鲲鶤
kun1 luan3	卵
kun1 wan2	頑
kun3	壼悃硱稛綑裍閫阃
kun4	困涃睏
kuo4	廓懖扩筈葀闊阔霩鞹韕
kuo4 she2	蛞
kuo4 shi4	适
kuo4 yue4	髺
kuo4 zhu2	燭
la1	柆翋菈
la1 la2 la3 la4 la5	拉
la1 la2 la3 la5	喇
la1 la2 li4	砬
la1 la5	啦垃
la1 lie4	邋
la1 xian4 xie2	搚
la1 xie2 zhe2	摺
la2	旯
la2 la4	剌
la3	藞
la4	揧楋瘌蠟辣鑞鬎
la4 lai4	癩
la4 lao4 luo1 luo4	落
la4 lie4	儠擸臘
la4 xi1	腊
la5	鞡
la5 lan2	蓝藍
lai2	崃崍庲来棶涞淶箂莱萊錸铼騋鯠鶆
lai2 lai4	來唻徕徠
lai2 lai4 li2 tai1 xi1 xi3	釐
lai2 lei3	郲
lai2 li2	黧
lai4	濑瀨癞睐睞籁籟藾賚賴赉赖
lai4 lan3	懶
lai4 li4	厲癘
lan2	兰岚嵐拦攔斓斕栏欗澜瀾灆灡篮籃籣蘭褴襤襴譋讕谰躝镧阑
lan2 lan3	婪
lan2 lan4	鑭闌
lan2 len4 lin2	啉
lan2 lian2	漣
lan2 lian4	欄
lan2 lin2	惏
lan3	壈嬾懒揽攬榄欖浨漤爦纜缆览醂
lan3 lan4	灠覽
lan3 lin3	廩懔顲
lan3 nan3	罱
lan4	滥烂爁爛糷
lan4 lian2 lian3 lian4	連
lan4 lian4	湅煉
lan4 tan3 tan4	僋
lan4 xian4	壏
lang1	啷
lang2	廊桹欴瑯硠稂螂鋃锒
lang2 lang3	榔
lang2 lang4	浪琅筤郎阆
lang2 lang4 liang2	莨
lang2 lang4 liang2 liang4	踉
lang2 liang2	蜋駺
lang2 luo3	鎯
lang3	塱朗烺
lang3 lang4	崀誏
lang3 lang4 liang3	閬
lang3 liang2	俍
lang3 liang4	悢
lang3 man2	樠
lang4	埌蒗
lao1	捞撈
lao2	劳崂嶗浶痨簩醪鐒铹顟
lao2 lao3 lao4 liao2 liao3	潦
lao2 lao3 liao2 liao3 liao4	轑
lao2 lao4	僗唠嫪澇癆
lao2 lao4 liao2	勞
lao2 lao4 lou2	牢
lao2 liao2	蟧
lao3	咾恅栳狫老銠铑
lao3 liao2	佬橑獠
lao3 liao2 liao3	僚
lao3 liao2 liao3 liao4	嫽
lao3 liao3 liu3 lu4	蓼
lao3 mu3	姥
lao4	橯涝耢軂
lao4 liao1 liao2 liao3 liao4	撩
lao4 lu4 luo4	酪
lao4 luo4	烙絡络
le1 lei5	嘞
le4	氻泐砳阞鰳鳓
le4 lei1 lei5	勒
le4 li4	仂叻
le4 liao2 luo4 yao4 yue4	樂
le4 yue4	乐
le5 liao3 liao4	了
lei1 lei2 lei4	擂
lei2	壨嫘瓃畾縲缧罍蔂蘲虆轠鐳镭
lei2 lei3	樏櫑磥
lei2 lei3 lei4	儡礌礧纍
lei2 lei3 lei4 lie4 lv4	累
lei2 lei3 luo3	儽
lei2 lei3 lv4	壘
lei2 lei4	檑雷
lei2 lian2	羸
lei2 lou2 lv2 lv3	婁
lei2 lu2 lv2	盧
lei2 luo3	欙
lei3	垒櫐灅癗磊礨絫耒蕾藟蠝誄讄诔鑸鸓
lei3 luo4 ta4	漯
lei4	泪禷类纇蘱酹銇頛類
lei4 li4	淚
leng2	塄薐
leng2 leng4	楞
leng2 leng4 ling2	稜輘
leng2 ling2	崚
leng3 ling2 ling3	冷
leng4	堎愣
leng4 ling2	倰
li1 li3 li4 li5 mai2 ying1	哩
li2	剺劙喱嫠孷廲梨漓灕犁狸琍璃筣篱籬糎縭缡罹菞蓠蔾藜蘺蜊蠫褵謧醨鑗骊鯬鲡鵹鸝鹂黎
li2 li3	鱺
li2 li3 li4 luo2 luo3	蠡
li2 li3 li4 si1	麗
li2 li3 sa3 xi3	纚
li2 li4	丽儷孋
li2 li4 zhi2	酈
li2 mai2	霾
li2 mai2 yu4	貍
li2 mao2	氂犛
li2 qi3 si4	梩
li2 sa3 shi1 xi3 xian3	灑
li2 shai1 shi1	釃
li2 tai2	斄
li3	兣娌李欚澧理礼禮粴裡逦邐醴鋰锂鯉鱧鲤鳢
li3 li4	俚欐
li3 li5	里
li3 lie4	峛
li4	俐俪傈儮利力励勵历厉厤吏呖唎唳嚦坜塛壢娳屴岦悷慄戾搮曆曞朸枥櫪歷沥溧濿瀝犡猁瑮瓅瓥疠疬痢盭砅砺砾磿礪禲秝笠篥粒粝糲苈荔莅蒚蒞藶蚸蛎蜧蠣詈讈赲轢轣轹郦隸雳靂靋鬁鱱鴗鷅麜
li4 lian4	浰
li4 lie4	例列捩栗綟
li4 long2 shi2	蝕
li4 lu4	觻
li4 lu4 luo4	鱳
li4 luo3	攭
li4 luo4	珞礫跞
li4 luo4 po1	濼
li4 luo4 yue4	櫟躒
li4 lve4 yue4	擽
li4 qi4 se4	泣
li4 sa4	颯
li4 shai4	攦
li4 shuo4 yue4	鑠
li4 wei4	位立
li4 xi2	蝷
li4 yue4	栎
li4 zhen3	沴
lia3 liang3	俩倆
lian2	嗹奁奩廉憐涟簾縺翴联聯臁莲薕蠊褳覝謰蹥连鎌鐮镰鬑鰱鲢
lian2 lian3	斂槤璉蓮
lian2 lian3 lin2 nian2 xian2 xian4	溓
lian2 lian4	僆鏈
lian2 lin2 lin4	瞵
lian2 ling2	苓零
lian2 ling2 ling3	怜
lian2 ling2 ling3 ling4	令
lian2 qian1	磏
lian2 qian3 xian4	槏
lian2 shao1	裢
lian2 xian3	濂
lian2 zhan4	譧
lian3	嬚敛琏羷脸臉蔹裣鄻
lian3 lian4	摙
lian3 lin4	膦
lian3 nian3	輦
lian3 xian1	蘞
lian4	堜恋戀楝殓殮潋澰瀲炼練练萰链
lian4 luan2	攣
lian4 luan2 luan3	孌
lian4 tuan2 zhuan1	鱄
liang2	墚梁椋樑粮粱糧綡輬
liang2 liang3	良
liang2 liang4	亮凉涼諒量
liang3	两緉裲魉魎
liang3 liang4	兩
liang3 man2 pan2	蹣
liang3 ying1	啢
liang4	喨晾湸谅輛辆
liao2	寥寮屪嶚憀敹暸疗簝缭膋蟟豂辽遼鐐飉鷯鹩
liao2 liao3	憭膫镽
liao2 liao3 liao4	燎
liao2 liao4	嘹廖料
liao2 liao4 shuo4	療
liao2 liu2	聊
liao2 liu2 liu4	鏐
liao2 liu2 xiao4	漻
liao2 liu4	飂
liao2 lu4	僇
liao2 rao3	繚
liao3	鄝
liao3 liao4	瞭釕钌
liao4	撂炓窷镣
liao4 liu2	蟉
liao4 niao3	尥
lie1 lie2 lie3 lie4 lie5	咧
lie3 lie4	裂
lie4	冽劣埒姴栵洌烈犣獵睙茢蛚趔躐迾颲鬣鮤鴷
lie4 luan2 pao1	脟
lie4 lv4	哷
lie4 pi2 xi3 xie2	奊
lie4 que4 xi1	猎
lie4 tai4	燤
lie4 xie2	劦
lin1 ling1	拎
lin2	临壣暽林潾燐琳璘碄繗翷辚邻鏻霖驎鱗鳞麟
lin2 lin3	嶙箖粼
lin2 lin3 lin4 ling2	磷
lin2 lin4	淋疄臨蹸轔遴鄰
lin2 lin4 ma2	痳
lin2 qin1 sen1 shen4	滲
lin3	凛凜廪懍檁檩菻
lin3 lin4	亃僯
lin3 xin3	伈
lin4	吝橉焛甐蔺藺賃赁躏躪閵
lin4 ren2 ren4	任
ling2	伶囹坽夌姈婈昤柃棂櫺欞淩澪灵爧狑玲琌瓴皊砱笭綾绫羚翎聆舲菱蔆蕶蘦蛉裬詅酃醽鈴錂铃陵霝靈駖鯪鲮鴒齡龄
ling2 ling3	岭彾泠軨
ling2 ling4	凌呤
ling2 long2	靇
ling3	嶺領领
ling4	另炩
liu1	熘
liu1 liu2	瀏
liu1 liu2 liu4	溜
liu1 liu4	蹓
liu2	刘劉媹嵧旒榴流浏琉瘤蓅裗鎏飀騮骝鰡鶹麍
liu2 liu3	懰藰
liu2 liu3 liu4	留
liu2 liu4	遛鎦镏餾馏
liu2 you2	斿游
liu3	嬼柳珋綹绺罶锍
liu3 lou2 lv3	僂
liu3 mao3	泖鉚
liu4	塯廇雡霤鷚鹨
liu4 lu4	六磟翏陆陸
liu4 lu4 luo4	碌
long1 long2	隆
long2	咙嚨巃曨栊櫳珑瓏癃矓砻礱窿聋聾胧茏蠪蠬鏧鑨鸗龒龙
long2 long3	朧笼籠躘
long2 long3 long4	儱蘢
long2 long4	襱豅
long2 mang2	龍
long2 pang2	龐
long2 shuang1	泷瀧
long3	垄垅壟拢攏陇隴
long3 long4	徿
long4	哢梇
long4 nong4	弄
long4 xiang4	衖
lou1 lou2 lv2	瞜
lou1 lou3	搂摟
lou2	娄廔楼熡耧艛蒌蝼螻鞻髅髏
lou2 lou3	耬
lou2 lou3 lou5	嘍
lou2 lou3 lv3	漊
lou2 lou4	漏
lou2 lou5	喽
lou2 lv2	樓
lou2 lv3	偻慺謱
lou3	塿嵝嶁篓
lou4	瘘瘺镂陋
lou4 lu4	露
lou4 lv2	鏤
lu1	噜撸謢
lu1 lu3	嚕擼
lu2	卢嚧垆壚庐栌泸瀘炉爐玈籚纑罏胪舻艫蠦轤轳鑪顱颅鱸鲈鸕鸬
lu2 lu3	蘆鹵
lu2 luo2	攎
lu2 lv2	廬櫨
lu2 lv3	臚
lu3	掳擄橹櫓氌滷磠艣蓾虏虜鏀鐪镥鲁
lu3 lv3	魯
lu3 xi1	卤
lu4	坴塶廘彔录戮摝淕淥渌漉潞琭璐甪盝睩硉祿禄稑簏簬籙蕗螰賂赂踛蹗轆辂辘醁錄錴騄鯥鵱鷺鹭麓
lu4 luo4	路
lu4 lv2	鹿
lu4 lv4	绿菉
lu4 shu1	攄
lu5	氇
luan2	圞奱娈孪孿峦巒挛曫栾欒滦灤癵羉臠銮鑾鸞鸾
luan2 ni2	臡
luan3 luo2	覶
luan4	乱亂
luan4 wan4	薍
luan4 zhi4	乿
lun1 lun2	抡掄
lun2	仑伦倫囵圇崙棆沦菕踚輪轮
lun2 lun3	蜦
lun2 lun3 lun4	碖
lun2 lun4	侖惀論论陯
lun3	稐
lun4	溣
luo1 luo2	罗
luo1 luo2 luo5	囉羅
luo1 lv3	捋
luo2	儸椤猡箩籮脶腡萝蘿螺逻鏍鑼锣镙騾骡鸁
luo2 luo3	欏
luo2 luo4	邏
luo3	倮剆瘰臝蓏裸
luo3 luo4 wo3	捰
luo4	峈摞洛犖纙荦雒骆
luo4 po1	泺
luo4 rua2 ruo2 sui1	挼
luo4 shuo4 yue4	爍
lv2	榈櫚膢藘閭闾驢驴
lv2 lv3	鷜
lv2 lv4	慮
lv3	侣侶儢吕呂屡屢履挔旅梠祣稆穭絽縷缕膂褛褸郘铝
lv3 lv4	鋁
lv4	勴垏嵂律氯滤濾綠繂膟葎鑢
lv4 lve4 shuai4	率
lve3 lve4	掠
lve4	略鋝锊
lve4 shuo4 yao4	藥
ma1	妈媽嬤
ma1 ma2	麻
ma1 ma3 ma4	蚂螞
ma1 mi2 mo2	摩
ma1 mo2	嬷
ma1 mo3 mo4	抹
ma1 zi1	孖
ma2	犘痲
ma2 ma3 ma4 ma5	嗎
ma2 ma3 ma5	吗
ma2 ma5	嘛
ma2 ma5 me5 mo2	麽
ma2 mi2 mi3	靡
ma2 mo4	蟆貊
ma3	溤玛瑪码碼鎷馬马鷌
ma3 ma4	傌榪犸
ma4	嘜杩礣禡罵骂鬕
ma4 mai4	唛
ma4 mo4	驀
ma5 me5 mei4	嚜
ma5 me5 mo2 yao1	么
mai2 man2	埋
mai2 wo1	薶
mai3	买嘪荬買鷶
mai3 mi1 mi3 mie1	咪
mai4	劢勱卖賣迈邁霢麥麦
mai4 mo4	脈脉
man1	颟
man1 man2	顢
man1 man4 yuan1	嫚
man2	姏慲瞒蛮蠻饅馒鬗鬘鰻鳗
man2 man3	矕
man2 man4	僈慢謾谩
man2 man4 wan4	槾蔓
man2 men2 men4	瞞
man2 men4	悗鞔
man2 mian3 wan4 wen4	絻
man3	屘满睌螨
man3 men4	滿
man4	墁幔曼漫熳獌縵缦鏝镘
man4 mu4	幕
man4 ou3 wan4	澫
man4 wan4	鄤
mang2	哤娏忙杗牻痝盲硭笀邙鋩駹
mang2 mang3	汒莽
mang2 meng2	庬氓甿蘉鸏
mang2 meng2 meng4	瞢
mang2 meng2 pang2	尨
mang2 pang2	厖
mang2 wang4	盳
mang3	壾漭
mang3 meng2	朦
mang3 meng3	蟒
mang3 mu3	茻
mao1 mao2	貓
mao1 mao2 miao2	猫
mao2	兞枆渵牦矛罞茅軞酕錨锚髦鶜
mao2 mao3	茆
mao2 mao4	毛
mao2 mao4 wu2 wu3 wu4	務
mao2 mao4 wu4	旄
mao2 meng2	蟊
mao2 meng2 rou2	髳
mao2 mou2	侔蛑鉾
mao2 mou2 wu3	堥
mao2 wu2 wu4	蝥
mao3	冇卯峁昴蓩铆
mao4	媢帽懋楙毷瑁耄芼茂蝐貿贸鄮
mao4 mei4	眊
mao4 meng2 wu4	霿
mao4 miao2	描
mao4 mo4	冒貌鄚
mao4 mou2	袤
mao4 mou2 mu4	牟
mao4 mu4	毣萺
mao4 wu2	瞀
mao4 xu4	勖
me5	麼
me5 mei2 mo4	没
me5 mo4	末
mei2	堳塺嵋徾攗枚梅沒湄煤猸玫瑂眉禖脢腜苺莓蘪郿酶镅霉鹛
mei2 mei3	楣
mei2 mei4	媒黴
mei2 men2 mi2	穈
mei2 meng2	鋂
mei2 mi2	糜
mei2 mou3	某
mei2 mu3 mu4	坶
mei2 wei1	溦
mei2 wen3	呅
mei3	媄媺挴每浼渼燘美鎂镁
mei4	妹媚寐煝痗眛蝞韎魅
mei4 mi2	谜
mei4 mo4	墨
mei4 mo4 wen3	昧
mei4 wei4	味
mei4 yi4	袂
men1 men4	悶闷
men2	扪捫璊菛虋鍆钔門门
men2 men4 men5	們
men2 men5	们
men2 min2	怋
men2 min2 wen2 wen4	汶
men2 wei3	亹
men4	懑懣暪焖燜
men4 qi3	呇
meng1 meng2 meng3	矇蒙
meng2	儚曚檬氋濛甍礞艨蕄虻鄳鄸饛
meng2 meng3	幪懞鼆
meng2 meng3 mian3 min3	黽
meng2 meng4	夢
meng2 meng4 ming2	盟
meng2 mian2 ming2	瞑
meng2 ming2	萌
meng2 ming2 ming3	嫇
meng2 qing3 xi2	莔
meng2 wu4	雺霧
meng3	勐猛瓾艋蠓錳锰
meng3 meng4	懵蜢
meng3 mian3 min3	黾
meng3 sheng2 ying4	鱦
meng4	孟梦霥
meng4 ming2	明
mi1 mi2 mi3 mi4	眯
mi1 mi3 mi4	瞇
mi2	冞弥爢猕獼縻蘼謎醚醾鸍麊麋麛
mi2 mi3 ni2	彌
mi2 mi3 ni3	濔瀰
mi2 mi4	迷
mi2 mo2	劘攠
mi2 mou2 wu3	瞴
mi2 ni3	檷祢
mi2 ni3 xian3	禰
mi2 she4 su4	摵
mi2 xi3	瓕
mi2 xian3	獮
mi3	弭敉渳灖米脒芈葞蔝銤
mi3 mie1	羋
mi4	冖冪嘧塓密峚幂幎幦榓汨滵漞熐羃蔤蜜覓覛觅謐谧鼏
mi4 ming2	蓂
mi4 ming2 ming3	溟
mi4 mo4	眽
mi4 si1	糸
mi4 yao1	幺
mian2	婂宀棉櫋矊矏綿绵蝒
mian2 mian3	媔
mian2 mian3 min3	眠
mian2 mian4 ming2	冥
mian2 min3	蠠
mian3	丏偭冕勉喕愐沔湎緬缅腼葂鮸
mian3 mian4	眄
mian3 sheng2	渑澠
mian3 tian3	靦
mian3 wan3 wen4	免娩
mian4	面麵
mian4 min3	泯
miao1	喵
miao2	媌嫹瞄苗鱙鹋
miao2 miao3	邈
miao2 pi2	蜱
miao3	杪淼渺秒篎緲缈
miao3 miao4	妙眇
miao3 mo4	藐
miao3 piao1 piao4	彯
miao3 sha1	紗
miao4	庙廟
miao4 miu4 mou2	缪
miao4 yao1	玅
mie1 mie5	咩
mie1 nie4	乜
mie4	幭懱搣滅灭篾蔑薎蠛衊鱴
mie4 mo4	瀎
mie4 pie1	覕
min2	岷崏旻旼民珉琝痻缗罠苠錉
min2 min3	暋鈱閔
min2 tian2 xian2	盷
min2 wen2	玟
min2 wen3	忞
min3	僶刡悯憫抿敏敯潣笢簢閩闵闽鳘
min3 ming3	皿
min3 sheng2 sheng4 ying4	繩
min3 wen3	呡
ming2	暝榠洺眳茗螟覭鄍銘铭鳴鸣
ming2 ming4	名
ming3	姳慏酩
ming4	命詺
miu4	謬谬
mo1 mo2	摸摹
mo2	嫫糢膜蘑謨谟饃馍髍魔
mo2 mo4	磨藦
mo2 mu2	模
mo2 wu2	无無譕
mo4	嗼塻妺寞暯枺歿沫漠爅瘼瞙秣粖纆耱茉莈蓦蛨蟔貘銆鏌镆陌默
mo4 mu4	縸艒莫
mo4 pa4	帕
mo4 wa4	袜靺
mo4 wan4	万
mo4 wen3	歾殁
mo4 wu4	勿
mou1	哞
mou2	呣洠眸謀谋鍪鴾麰
mou2 mu4	鞪
mou2 mu4 wu4	婺
mou2 wu2	毋
mou3 mu3	畝
mou3 si1	厶
mu2	毪氁
mu2 mu3 wu2 wu3	母
mu3	亩姆峔拇牡牳砪踇鉧
mu4	仫墓幙慔慕暮木楘沐炑牧目睦穆苜莯蚞鉬钼霂
mu4 wu4	鶩
na1 na3 na4 nai3 ne2 ne4 nei3 nei4 nuo2 nuo4	那
na1 nan2	南
na2	拏拿镎
na2 nao2 nu3	呶
na2 ni4	誽
na2 nu2 ru2	挐
na2 ru2	蒘
na3 na4 na5 nai3 ne2 nei3 nie4 nuo2	哪
na4	吶捺笝納纳衲豽軜钠魶
na4 na5 ne4 ne5 nuo4	呐
na4 nan4	妠
na4 nei4 rui4	内
na4 nian3 shen3	淰
na4 nu4	肭
na4 nuo2	娜
na4 rui4	鈉
na4 ruo4	箬
nai2	孻
nai2 nai4 neng2 tai2 xiong2	能
nai2 nai4 neng3	螚
nai2 ni3 nie4 yi4	掜
nai2 zhi4	摨
nai3	倷奶氖迺釢
nai3 ni3	妳
nai3 reng2 reng4	艿
nai4	奈柰渿萘褦錼鼐
nai4 neng2	耐
nan1 nie4	囡
nan2	抩暔楠男莮
nan2 nan3	喃萳
nan2 nan4	諵难
nan2 nan4 nuo2	難
nan2 ran2	柟
nan2 yan1 yan3	弇
nan3	戁揇湳腩蝻赧
nan4	婻
nan4 tan1	攤
nang1 nang2	囊
nang1 nang5	囔
nang1 rang2 xiang1	蘘
nang2 nang3	馕
nang2 nang4	鬞
nang2 nong2	噥
nang2 nou2	譨
nang2 rang3 shang4	蠰
nang3	擃攮曩灢
nang3 rang2 rang4	瀼
nang4	齉
nao1	孬
nao2	夒峱嶩挠猱硇蛲铙
nao2 nao3	獿
nao2 nao3 you1	獶
nao2 nao4	鐃
nao2 niu2	怓
nao2 rao2	橈
nao2 rao4	蟯
nao2 rao4 xiao1	撓
nao2 rou2	蝚
nao2 xiao1	譊
nao3	垴恼惱瑙脑
nao3 nao4	腦
nao4	闹鬧
ne4	疒眲訥讷
ne5 ni1 ni2 ni3	呢
nei3	腇餒馁
nei3 rui2 wo3	婑
nei3 sui1	娞浽
nei3 wei4	餧
nei4	內氝
nen4	嫩
nen4 nin2 ren4	恁
nen4 rui4	枘
ni1 ni2	妮
ni2	坭屔怩淣猊蜺觬跜郳铌霓鯢鲵麑齯
ni2 ni3	婗尼抳鈮
ni2 ni3 ni4	伲
ni2 ni3 ni4 nie4 ning4	泥
ni2 ni4	秜
ni2 ni4 nie4	倪
ni2 qie4	蛪
ni2 yi4	輗
ni3	你拟擬旎晲狔苨薿隬馜
ni3 ni4 zhi4	昵
ni3 nie4	鑈
ni4	堄嫟惄暱睨縌腻膩逆
ni4 niao4 ruo4	溺
ni4 ning2 ning4	濘
ni4 she4	灄
ni4 te4	匿慝
ni4 yi2	嶷
nian1 nian3 nie1	捻
nian1 yan1 yan4	蔫
nian2	哖鯰鲇鲶黏
nian2 nian4	姩
nian2 ning4	年
nian2 zhan1	粘
nian3	撚撵攆碾簐躎辇
nian3 ren3	涊
nian3 zhan3	輾辗
nian4	卄廿念
niang2	娘
niang2 niang4	酿釀
niang2 rang2	孃
niao3	嫋嬝嬲茑蔦袅裊褭
niao4	脲
niao4 sui1	尿
nie1	捏
nie2 nie4	苶
nie4	啮嗫囓孽嵲嶭巕敜櫱涅篞糱聂臬臲蠥讘踂踗踙蹑躡鎳鑷镊镍闑陧隉顳颞齧
nie4 sha4 she4 zhe2	攝
nie4 she4 ye4 zhe2	聶
nie4 shen3	諗
nie4 xie4 yi4	槷
nie4 xing4	幸
nie4 yan2	嵒
nie4 yao3	嚙
nie4 yi3	钀
nie4 yi4	喦
nie4 zhe2	囁
nie4 zui4	鋷
nin2	您
nin3	拰
ning2	儜凝咛嚀嬣寍檸狞獰聍聹薴鸋
ning2 ning3	鑏
ning2 ning3 ning4	拧擰
ning2 ning4	寧甯
ning2 ning4 zhu4	宁
ning2 rang2	鬤
ning2 rang3 rang4 xiang3	攘
ning2 yi2	疑
ning2 zhu4	苧
ning4	佞
ning4 zhu4	泞
niu2	牛
niu3	忸炄紐纽钮
niu3 nv4	狃
niu3 rou4	莥
niu4 you3 you4	蚴
nong2	侬儂农哝浓濃穠脓膿襛農醲
nong3	繷
nong4	齈
nou2	羺
nou4	耨
nou4 nu3 ru3 ru4 ruan2	擩
nou4 ru2	嬬獳
nou4 ru2 ruan3	檽
nu2	奴孥笯駑驽
nu2 nu3	砮
nu2 tang3	帑
nu3	努弩
nu3 nv3	胬
nu4	怒
nu4 ru4	褥
nuan2	奻
nuan2 nuan3	渜
nuan3 nuan4	餪
nuan3 xuan1	暖煖
nuo2	傩儺挪梛
nuo2 nuo3	橠
nuo4	懦懧搦糑糯諾诺逽锘
nuo4 re3	喏
nuo4 ru2 ruan3 xu1	需
nuo4 ruan2	堧
nuo4 ruan3	耎
nv3	籹釹钕
nv3 nv4 ru3	女
nv4	恧朒衄
nve4	虐
nve4 yao4	疟瘧
o1 o4 o5 wo1 wu1	喔
ou1	櫙欧殴瓯藲讴鷗鸥
ou1 ou3	歐甌
ou1 ou3 ou4	呕
ou1 ou4	慪沤漚熰
ou1 qu1	区敺
ou1 shu1	樞
ou1 xu2	謳
ou1 yu1	紆
ou1 yu4	醧
ou2 yu2	齵
ou3	偶吘耦腢蕅藕
ou3 yong2 yu4	遇
ou4	怄
ou4 wo4	握
ou4 wo4 wu1	渥
pa1	啪舥葩趴
pa1 pa4	帊
pa2	爬琶筢
pa2 shou3	掱
pa4	袙
pai2	俳徘牌犤簰
pai3 po4	迫
pai4	蒎鎃
pan1	攀眅
pan1 shan1 xian1	姍
pan2	媻幋槃瀊盘磐縏蒰蹒鞶
pan2 pan4 pang4	胖
pan2 peng4	踫
pan2 pi2 po2	鄱
pan2 po2	皤
pan2 qiang2	爿
pan2 shen3	審
pan2 xuan2	盤
pan2 yan4	彦
pan2 zhou1	洀
pan3 xi4	盻
pan4	判叛沜泮溿牉畔襻詊頖
pan4 pian1 pian4	片
pang1	乓
pang1 peng1	滂
pang2	庞
pang2 peng2	篣
pang3	耪
pao1	抛拋脬
pao1 pao2 pao4	泡
pao2	匏咆庖狍鞄
pao2 po2	謈
pao4	奅疱皰麭
pao4 piao1	犥
pei1	呸怌胚醅
pei2	毰賠赔锫陪
pei2 peng1	駍
pei2 pi1 pou3	培
pei3	俖
pei4	伂佩姵旆沛浿珮轡辔配霈
pei4 pi1	帔
pei4 pi4	淠
pei4 po4	昢
pen1	歕
pen1 pen4	喷
pen2	盆
pen2 pen4	湓
pen3	呠翸
peng1	匉嘭怦恲漰烹磞軯
peng1 peng2	弸澎硼
peng1 peng4	閛
peng1 peng4 ping1	砰
peng1 ping2	泙洴苹荓
peng2	憉朋棚樥篷芃蟛輣鑝韸髼鬅鹏
peng2 peng3 ping2	倗
peng2 peng4	膨蓬
peng2 ping2	淜
peng2 zhuang1	庄
peng3	剻皏
peng4	掽椪碰
pi1	丕伓伾噼憵披狉砒礔秠纰邳銔霹駓髬
pi1 pi2	批鈹铍魾
pi1 pi3	劈
pi1 pi4	闢
pi1 pi4 zhao1	釽
pi1 pie3	苤
pi1 wu4	痦
pi2	啤岯毗毘毞琵疲皮罴羆膍蚍蚽螷蠯貔郫阰鵧鼙
pi2 po1 po3 po4	頗
pi3	匹嚭圮庀痞癖銢鴄
pi3 shu1 ya3	疋
pi4	僻屁澼甓睥譬鷿
pi4 piao4 pie1	潎
pi4 pu1	扑
pian1	偏媥犏篇翩
pian2	楄楩胼蹁駢骈骿
pian2 pian3	諞谝
pian3	貵
pian4	騙骗
piao1	旚翲螵飄飘魒
piao1 piao3	縹缥
piao1 piao3 piao4	瞟
piao1 piao4	嘌慓票
piao2	瓢薸
piao2 po1 po4 pu1 pu3	朴
piao3	皫醥顠
pie1	氕
pie3 yi4	丿
pie4	嫳
pin1	礗驞
pin1 pin2	姘
pin2	嚬嫔嬪玭矉蠙貧贫顰频颦
pin2 ping2	蘋
pin3	品榀
pin4	牝
pin4 ping1	娉
pin4 ping4	聘
ping1	乒俜涄甹砯竮艵
ping1 ping3	頩
ping2	凭呯坪帡憑枰玶瓶缾萍蓱蛢評评軿郱鲆
po1	坡岥泼鏺钋
po1 po3	颇
po1 po4	釙
po2	婆櫇
po3	叵笸钷
po3 pou1	剖
po4	岶烞珀破粕蒪
pou2	抔
pou3 yin4	堷
pu1	噗攴攵
pu1 pu2	仆
pu1 pu3	潽
pu1 pu4	鋪铺
pu2	匍墣濮獛璞瞨蒱酺鏷镤
pu2 pu3	樸
pu3	圃普氆浦烳譜谱蹼鐠镨
pu4	舖
qi1	僛凄娸慼柒桤桼榿欺緀萋諆迉郪鏚霋魌鶈
qi1 qi2	七
qi1 qi2 qi3	碕
qi1 qi2 qi4	倛
qi1 qi4	妻悽
qi1 qian4	淒
qi1 qie4	沏漆
qi1 su4 xiu3 xiu4	宿
qi1 xi1	栖棲溪磎螇蹊鸂
qi1 xi1 xu4	恓
qi1 xu3	諿
qi1 yi1	欹
qi1 za1 zu2	嘁
qi1 zu2	傶
qi2	亓埼岐岓掑旂旗歧淇濝玂琦琪畦疧祺肵脐臍艩蕲藄蚑蚚蛴蜞蠐軝釮颀騏騹骐骑鬐鬿鯕鰭鳍鵸鶀麒麡
qi2 qi3 yi1	崎
qi2 qi4	綦
qi2 qin2	勤
qi2 shi2 shi4 zhi4	示
qi2 shi4	忯
qi2 shi4 zhi3	耆
qi2 si4	俟
qi2 ti3 zhi1 zhi3	衹
qi2 yi3	錡
qi2 yi4	鮨
qi2 yin2	圻
qi2 zhi1	枝
qi2 zhi1 zhi4	支
qi2 zhi3	扺祁蚔
qi2 zhi4	忮
qi3	企启啟婍屺杞棨绮芑起邔
qi3 qi4	乞气
qi3 qing3 qing4	綮
qi3 yi3	綺齮
qi4	咠唭器弃憩栔棄汔湆湇甈盵碛磧罊芞葺訖讫迄
qi4 qie1 qie4	切
qi4 qie4	砌
qi4 sa4 ta1	趿
qi4 se4 zi4	漬
qi4 xi4	氣
qi4 xi4 xie1	滊
qi4 yi4	忔
qi4 zhi1 zi1	吱
qi4 zhu2	磩
qia1	掐葜
qia1 qu1	佉
qia3	酠
qia4	冾帢恰殎硈
qia4 xia2 ya4	磍
qian1	仟佥僉兛千奷岍悭愆扦搴攐攓檶櫏牵签簽籤粁褰谦迁遷钎阡韆顅骞
qian1 qian3 qian4 qie4 xian2	嗛
qian1 qian4	牽縴芊
qian1 qiang3	羥
qian1 se4 zhai4	寨
qian1 wa3	瓩
qian1 wan4	掔
qian1 xian1	孅杴
qian1 xian2	慳
qian1 yan2	汧鉛铅
qian1 zhan4	謙
qian1 zhong1	鈆
qian2	墘媊岒拑掮榩潛潜灊箝虔軡钤钱钳騚騝鰬黔
qian2 qin2	忴扲蚙
qian2 shan1 shan3	煔
qian2 tan2 xun2	燂蕁
qian2 xian2 yan2	羬
qian2 xun2	燖荨
qian2 zhen1	葴鍼
qian3	繾缱蜸譴谴
qian3 qian4	遣
qian3 qian4 qie4 xian2	慊
qian3 xu4	肷
qian4	堑棈椠槧欠歉篟芡蒨輤
qian4 qing1 zheng1	綪
qian4 qing4	倩
qian4 xi1	茜
qian4 xian1	纤
qian4 xian4	俔
qian4 xin1	廞
qiang1	嶈斨枪牄羌蜣謒錆鏘锖锵
qiang1 qiang3	抢鏹镪
qiang1 qiang4	呛戗跄蹌蹡
qiang1 qing1 qing4	慶
qiang1 qiong1 qiong2	跫
qiang1 zang1	戕
qiang2	丬墙嫱嬙樯檣漒牆蔷蘠
qiang2 se4	廧薔
qiang3	墏繈羟襁
qiang4	唴炝熗羻
qiao1	幧敲橇毃硗趬跷踍郻鄡鍬锹頝
qiao1 qiao2	劁
qiao1 qiao3 qiao4	悄
qiao1 qiao3 que4	雀
qiao1 qiao4	墝蹺
qiao1 que4	塙碻
qiao1 sao1	缲
qiao1 sao1 shu1	橾
qiao1 sao1 zao3	繰
qiao1 shan1 shen1	幓
qiao1 xiao1	燆
qiao1 yao2 yao4	窯
qiao1 zao4	喿
qiao2	乔侨憔桥樵犞瞧礄荍荞鞒
qiao2 qiao4	嘺翘翹譙谯
qiao2 shao2 zhao1	招
qiao2 shao4 xiao1	睄
qiao2 zhao3	菬
qiao3	巧髜
qiao3 qiu4	愀
qiao4	峭帩撬窍竅誚诮躈
qiao4 shao1	鞘
qiao4 shao1 shao3 shao4 xiao1	捎
qiao4 shao4 xiao1 xue1	削
qiao4 shuo4 xiao1	箾
qiao4 xiao1	硝踃
qiao4 xiao1 xiao4	俏
qiao4 yao2	顤
qie4	厒妾怯惬愜朅窃竊箧篋緁藒踥鍥鐑锲鯜
qie4 sha4	唼
qie4 xi4	郄
qin1	嶔衾钦顉駸
qin1 qin3	侵梫
qin1 qin4	唚
qin1 qin4 yin2	欽
qin1 qing4	亲親
qin1 xian1	綅
qin2	嗪噙埁庈懃擒檎澿琴瘽禽秦耹芹螓鈙雂靲鳹
qin2 shen1	嫀
qin2 tan2 yan3	覃
qin2 xin2	鬵
qin2 yin2	芩
qin2 zhen1	溱蓁
qin3	坅寑寝寢昑笉螼锓
qin4	吣揿撳沁瀙菣藽
qin4 xin1	鈊
qing1	倾卿圊氢氫轻郬鑋
qing1 qing3	傾漀
qing1 qing3 qing4	廎
qing1 qing4	清輕
qing1 zheng1	埥鯖鲭
qing2	勍情擎晴樈氰黥
qing2 qing3 qing4	請
qing3	苘请顷
qing3 qing4	磬謦
qing4	凊庆掅碃罄
qing4 sheng1	声
qing4 sheng1 sheng4 xing1	胜
qiong1 qiong2	銎
qiong1 xiong1	芎
qiong2	惸憌桏橩煢琼穷窮笻筇茕藑藭蛬赹邛
qiong2 wei3 wei4	瓗
qiong2 xuan2	琁瓊
qiu1	丘坵媝恘楸秋緧蚯蝵蟗蠤邱鞦鰍鳅鶖
qiu1 qiu2	遒
qiu1 su4 xiao1	橚
qiu1 xiao1 xiu1	櫹
qiu1 ye4	邺
qiu2	俅唒囚崷巯巰梂殏毬求煪犰球璆盚紌絿莍虬虯蛷裘觓觩賕赇逑酋釚銶鮂鯄鰽鼽
qiu2 rou2	厹
qiu2 tuan2	团
qiu2 tun3	氽
qiu2 you1	泅
qiu3	糗
qu1	岖嶇抾浀祛胠蛐袪诎趋躯軀镼阹驅驱髷鱋麴黢
qu1 qu3	取曲紶
qu1 qu4	去觑
qu1 xie2	魼
qu1 zhou4 zhu1 zou1	騶
qu1 zu3	組
qu2	佢劬斪欋氍淭灈璩癯磲絇翑胊臞菃葋蕖蟝蠷衢躣鸲鼩
qu3	齲龋
qu3 yu3	蝺
qu4	刞覷闃阒麮鼁
qu5 xu1	戌
quan1	鐉駩
quan1 xun2	悛
quan1 zhuan1	恮
quan2	佺全姾巏拳权泉牷犈瑔痊筌絟縓觠詮诠辁銓铨顴颧鬈齤
quan2 quan4 xun2	灥
quan2 shuan1	拴
quan2 shuan1 shuan4	栓
quan2 shuan4 tuan2	槫
quan2 yuan2	謜
quan2 zhuan4	譔
quan2 zun1	跧
quan3	烇犬犭畎綣绻虇
quan3 zhen4 zhun4	甽
quan4	劝勸牶
quan4 xuan4	券
que1	蒛
que1 que4	阙
que2	瘸
que4	却悫愨榷皵确確礭阕鵲鹊
que4 shuo4 yue4 zhuo2	汋
que4 tuo1 xi4	舄
que4 xi1	碏
qun1	囷峮
qun1 suo1 xun4	逡
qun1 yin3	輑
qun2	宭群裙
ran2	呥然燃袡髯
ran2 tian4	蚺
ran3	姌染珃苒
ran3 yan1	橪
rang1 rang3	嚷
rang2	獽瓤禳躟
rang2 rang3 reng2	穰
rang2 xiang1	儴勷鑲
rang3	壤爙
rang3 sang1 xiang1	纕
rang3 xiang1	忀
rang4	懹讓让
rang4 xiang1	欀
rao2	桡荛襓饒饶
rao2 rao3	娆
rao2 rao3 yao3	嬈
rao2 yao2	蕘
rao3	擾隢
rao3 rao4	繞绕
rao3 you4	扰
rao4	遶
rao4 xiao1	穘
re2 re3 re4 ruo4	若
re2 ruo2 wei3 wo1	捼
re3 ruo4	惹
re4	热熱
re4 ruo4	偌渃
ren2	人亻仁壬芢鵀
ren2 ren3	銋
ren2 ren4	妊
ren3	栠稔荏荵
ren3 ren4	忍
ren3 shen3	棯
ren4	仞刃屻牣紉紝纫肕衽訒認认軔轫韌韧飪饪
ren4 shen4	葚
reng1 reng4	扔
reng1 rong2	戎
reng2	仍礽
ri4	日鈤馹
rong1 rong2 rong3	茸
rong2	媶嫆嵘嶸榕榮榵毧溶瀜烿熔爃狨瑢絨绒羢茙荣蓉蝾融蠑褣鎔駥
rong2 rong3	氄
rong2 song4	頌
rong2 yong3	傛容
rong3	傇冗
rong3 ru4	縟
rou2	媃揉柔禸粈糅鍒鞣騥鰇鶔
rou2 rou3	煣葇蹂輮
rou2 ru2 xu1	鑐
rou3	韖
rou3 rou4	楺
rou4 ru4	肉
ru2	侞儒嚅如孺帤曘筎茹蕠薷蠕袽襦醹銣铷颥鴽
ru2 ru4	洳溽
ru2 ruan3	燸蝡
ru2 xu1	繻
ru2 zhou4 zhu1 zhu4	咮
ru3	乳汝辱鄏
ru4	入嗕媷缛蓐
ru4 yue4	月
ruan2	壖
ruan2 rui2 run2 ruo2 sui1	撋
ruan3	瓀礝軟软
ruan3 ruan4	緛
ruan3 wan3	朊
ruan3 yuan2	阮
rui2	桵緌蕤
rui2 shuai1 sui1 sui2 tuo3	綏
rui2 wei1 wo1	踒
rui3	橤繠
rui3 suo3	惢
rui4	叡瑞睿蚋銳锐
rui4 ruo4	芮
rui4 tun1	汭
run4	橍润潤閏闰
ruo4	弱楉爇篛蒻鄀鶸
sa1	仨
sa1 sa3	撒
sa1 sha1 suo1	挲
sa3 ta1	靸
sa3 xie4	躠
sa4	卅脎萨薩隡飒馺
sa4 san3 xian4	鏾
sa4 sha1 shai3	摋
sa4 sha1 shai4 shi4 xie4	殺
sa4 sha4 yi4 zha2 zha4	霅
sa4 xi4	鈒
sa4 xue4	泧
sai1	噻毢腮鳃
sai1 sai4 se4	塞
sai1 si1	思
sai1 sui1	毸
sai1 xi2	鰓
sai4	僿賽赛
san1	三叁毵毿
san1 san3 san4	散
san1 san3 shen1	糝蔘
san1 san4	鬖
san3	伞傘繖馓
san3 shen1	糁
san3 xian4	霰
san4	閐
sang1	桑
sang1 sang4	丧喪
sang3	嗓搡磉褬鎟顙颡
sao1	溞缫骚鱢鳋
sao1 sao3 xiao1	騷
sao1 sao4	搔臊
sao1 sao4 shao4 xiao1 xiao4	哨
sao1 sou1	颾
sao1 zao3	繅
sao3	嫂
sao3 sao4	埽扫掃
sao4	氉瘙矂
sao4 shao1 shao4 xiao1	梢
sao4 zao4	燥
se4	啬嗇涩澀濇濏瑟璱穑穡譅轖銫鏼铯飋
se4 sha1 shi4	鎩
se4 shai3	色
se4 su4	愬
se4 suo3	鎍
se4 suo3 suo4	溹
se4 ta4 xi4	闟
se4 xi4	虩
sen1	森
sen1 shan1	襂
sen1 shen3	槮
seng1	鬙
sha1	剎唦杀樧猀痧砂硰纱蔱裟铩鯊鲨
sha1 sha4	煞
sha1 sha4 suo1	沙
sha1 shai4	閷
sha1 shan1	杉
sha1 she1	賒
sha1 sui1 suo1	莎
sha1 suo1	魦
sha2 sha4	啥
sha3	傻
sha4	翜翣萐霎
sha4 xia2	歃
sha4 xia4	厦廈
sha4 ye1 yi4	噎
sha4 zha2	箑
sha5	繌
shai1	筛簁
shai1 shi1	篩酾
shai3	繺
shai4	晒曬
shan1	删刪剼姗山搧潸煽狦珊痁笘羶舢衫跚
shan1 shan4	扇钐
shan1 shan4 xian1	釤
shan1 shen1	葠
shan1 wei3	芟
shan1 xian1	襳
shan1 xian3	彡
shan1 yan2	埏挻
shan1 yan4	烻
shan1 zha4	柵
shan3	晱睒覢閃闪陕陝
shan3 tan2	顃
shan4	善墡擅樿灗疝繕缮膳蟮訕謆讪赡赸鄯騸骟鱔鳝
shan4 shuan4	汕
shan4 tan1	潬
shan4 tan2	檀
shan4 yan3	剡
shan4 yan3 yan4	掞
shan4 zhan1	鱣
shang1	伤傷商墒殇殤熵蔏螪觞觴謪鬺
shang1 tang1	汤
shang1 tang1 tang4 yang2	湯
shang1 tang2 tang3	踼
shang1 tang4	漡
shang1 yang2	禓
shang3	晌賞赏
shang3 shang4	上
shang3 xiang3 xiang4	曏
shang4	恦绱
shang4 zhang3	鞝
shao1	弰旓烧筲蕱輎鮹
shao1 shao3 shao4	髾
shao1 shao4	燒稍艄
shao1 shuo4 xiao1	萷
shao1 sou1 sou3	溲
shao1 xiao1	綃莦蛸
shao2	玿韶
shao2 tiao2	苕
shao3 shao4	少
shao3 sou1 sou4 xiao1	搜
shao4	劭卲潲绍袑邵
shao4 shuo4 yao4	燿
shao4 tiao2	笤
shao4 zhao4	召
she1	奢檨猞畲赊輋
she1 yu2	畬
she2	佘
she2 shi1 ta1 tuo2 yi2	鉈
she2 ti2 zhe1 zhe2	折
she2 xie2 xu2 ya2 ye2	邪
she2 ye4	抴
she2 za2	磼
she3	捨
she3 she4 shi4	舍
she4	厍厙慑懾摄涻滠社蔎蠂設设韘騇麝
she4 xi1 xie2	歙
she4 ye4	葉
she4 ye4 yi4	射
she4 zhe2	慴
shei2 shui2	誰谁
shen1	伸侁兟呻堔妽娠屾峷柛氠深燊珅甡申眒砷籸紳绅詵诜駪鯓
shen1 shen2	神
shen1 tian2	搷
shen1 xian1	姺
shen1 xin1	莘
shen1 xin4	信
shen1 zhen4	震
shen2 shen4	甚
shen2 shi2	什
shen3	哂婶嬸审曋渖瞫矧覾讅谂邥
shen3 yin3	吲
shen4	侺渗祳罧肾脤腎蜃鋠
shen4 zhen1	椹
shen4 zhen4	慎蜄
sheng1	升呏昇泩湦焺牲生甥笙聲鉎陞鵿鼪
sheng1 xing1	狌
sheng1 xing4	姓
sheng2	憴绳譝
sheng3	偗渻眚
sheng3 xian3	冼
sheng3 xian3 xing3	省
sheng3 xing1 xing3	箵
sheng4	剩勝聖貹賸
sheng4 ying4	媵
shi1	尸师師湤湿溮溼狮獅絁葹蓍虱蝨褷襹詩诗邿鰤鲺鳲鶳
shi1 shi3 yi4	施
shi1 shi4	屍
shi1 ta4 xi2	濕
shi1 xu1	嘘
shi1 yi2	箷
shi1 yi4	失
shi1 zhi4	厔
shi2	十埘塒实寔时時榯湜溡炻祏蚀饣鰣鲥鼫鼭
shi2 shi4	莳蒔
shi2 shi4 zhi4	識识
shi2 si4 yi4	食
shi2 xie2 zhi1	汁
shi2 zhi4	實
shi2 zu2	鉐
shi3	使史始矢豕駛驶
shi3 si1	斯
shi3 tan1	痑
shi3 tuan4	彖
shi3 xi1	屎狶
shi4	世仕侍势勢嗜噬士奭室弑弒恀拭揓柿栻烒礻筮簭舐襫視视觢試誓諡试谥貰贳軾轼逝遾释鈰鉽铈饰
shi4 shi5 zhi2	殖
shi4 si4	似寺
shi4 tai4	忕
shi4 te4	式
shi4 ti2	惿是褆
shi4 ti3	徥
shi4 tu2 zhai2	檡
shi4 xi4 yi4	謚
shi4 xie4	齛
shi4 ye4	液
shi4 yi2	戺
shi4 yi4	埶繹醳釋
shi4 zhe1	螫
shi4 zhi1	肢
shi4 zhi4	峙恃銴
shi4 zhuai3	跩
shi4 zi4	事
shi4 zuo4	唑
shou1	收
shou2 shu2	熟
shou3	手艏首
shou3 shou4	守
shou4	兽壽寿授狩獸瘦綬绶
shou4 shu2	售
shou5	扌
shu1	书倏叔姝抒摅書枢梳殊殳焂疏紓綀纾軗输鄃陎鮛鵨
shu1 shu3	蔬
shu1 shu4	輸
shu1 tiao2	儵
shu1 tou4	透
shu1 tu1	瑹
shu1 xiao1	翛
shu1 xie4 yu4	豫
shu1 yu2	毹
shu1 yu4	悆舒
shu1 zhu1	朱
shu1 zhu4	紵
shu2	塾婌孰秫赎
shu2 shu4	贖
shu2 shu4 zhu2	术
shu2 zhu2	蠾
shu3	暑曙潻癙糬署薯蜀襩黍鼠
shu3 shu4 shuo4	数數
shu3 sou3	籔
shu3 tu2	稌
shu3 zhu1	藷
shu3 zhu3	属屬
shu3 zhuo2	鐲
shu4	怷恕戍束树樹沭漱竖虪術裋豎述鏣鶐
shu4 shuo4 sou4	嗽
shu4 sou1 su4	涑
shu4 xu4	鉥
shu4 xun2	咰
shu4 yao2 yu2	隃
shu4 ye3	墅野
shu4 yu2	俞腧
shu4 yu4	鷸
shu4 zhe1 zhu4	庶
shu4 zhe1 zhuo2	謶
shu4 zhu2	朮
shu4 zhu4	尌杼澍
shua1	唰
shua1 shua4	刷
shua1 shuan4	涮
shua1 suan4 xuan3 xuan4	選
shua3	耍
shua4 suo1	唆
shuai1	摔
shuai3	甩
shuai4	帅帥蟀
shuan1	閂闩
shuan4 tuan2 zhuan1	專
shuang1	双孀孇礵艭雙霜驦
shuang1 shuang3	爽鷞
shuang3	塽慡樉縔
shuang3 song3	傱
shuang4	灀
shui2	脽
shui3	水
shui4	帨涗睡稅裞
shui4 shuo1 yue4	说
shui4 tuan4 tui4 tuo1	税
shui4 zhui4	娷
shui5	氵
shun3	吮
shun4	瞚瞬舜蕣順顺鬊
shun4 xuan4 xun2	眴
shun4 xun2	恂
shun4 xun2 yan2	巡
shuo1	說
shuo4	搠朔槊烁獡硕碩蒴鎙铄
shuo4 sou4	欶
shuo4 su4	洬溯
shuo4 suo1	嗍
shuo4 xian1 xiao1	揱
shuo4 yue1	妁
shuo4 zhao4 zhuo2	濯
si1	丝俬凘厮咝嘶廝楒榹泀澌禗禠私絲緦纟缌罳蕬蛳螄蟴鉰锶颸鷥鸶鼶
si1 song1	鍶
si1 ti2	磃謕
si1 ti2 xi1 zhi4	虒
si1 xi1	撕析菥蜤
si1 xi3	徙
si1 yi2	螔
si1 zhi4	傂
si3	死
si4	儩兕嗣四姒柶汜泗洍涘祀笥耜肂蕼覗貄飼饲駟驷
si4 tai1 tai2 yi2	台
si4 ti4	肆
si4 yi2	飴
si4 yi3	以已巳
si4 yi4	肄
song1	倯凇娀崧嵩松淞濍硹菘蜙
song1 song2 song4	鬆
song1 zhong1	忪
song3	嵷怂悚愯慫竦耸聳駷
song4	宋訟誦讼诵送颂
sou1	廋獀艘螋鄋醙鎪锼颼飕餿馊騪
sou1 sou3 xiao1	叟
sou1 sou4 su4	嗖
sou1 su4 xiao1	潚
sou3	嗾瞍薮
sou3 sou4	擞擻
sou3 sou4 xiao3	謏
sou3 zou1	棷
su1	囌櫯甦稣穌窣苏蘇酥
su1 xu4	卹
su2	俗
su4	傃僳嗉塑夙嫊愫憟榡樕泝玊簌粟素縤肃肅膆蔌藗觫訴謖诉谡蹜速鋉餗驌鱐鷫
su4 sui4	埣
su4 suo1	縮缩
su4 xie4	僁
su4 xu5	蓿
su4 yin4	梀
su4 you2	莤
suan1	痠酸
suan3	匴
suan3 zhuan4 zuan3	篹
suan4	筭算蒜
suan4 xuan3 zhuan4	撰
sui1	倠哸滖濉荾虽雖
sui1 suo1	蓑
sui1 wei3	荽
sui1 zui1 zui3	嗺
sui2	绥随隨
sui2 sui4	遂
sui2 wei4 yi2	遺
sui3	瀡髓
sui4	岁旞檖燧璲碎祟禭穗穟繐繸襚誶谇賥邃鐆鐩
sui4 suo4	歲
sui4 zhui4	隧
sui4 zui4	睟
sun1	孙搎槂狲猻荪蓀蕵薞飧
sun1 xun4	孫
sun3	损損榫笋鎨隼
sun3 xian1 xian3	跣
sun3 xun2	栒
sun3 xun4 yun2	筍
sun3 zhuan4	簨
sun4 xun4	潠
suo1	傞摍桫簑莏趖
suo1 suo3 suo4	娑
suo1 suo4 xie1	些
suo1 suo5	嗦
suo1 xi1	犧
suo1 xi1 xian4	獻
suo1 xun4	梭
suo1 zui1	羧
suo3	唢嗩所琐瑣索鎖锁
suo3 zao3	璅
suo4	逤
ta1	榙溻祂褟
ta1 ta4	嚃踏
ta1 ta4 ta5	遢
ta1 tai4	太
ta1 tuo2	他牠铊
ta1 tuo2 yi2	它
ta3	獭獺鳎
ta4	挞撻榻毾涾濌禢誻蹋遝錔闒闥闼鞜鞳
ta4 tan4	傝
ta4 tuo4 zhi2	拓
tai1	胎
tai1 tai2	苔
tai1 yi2	珆
tai2	嬯檯炱籉臺薹跆邰颱鮐鲐
tai2 tai4	儓
tai2 ying1	旲
tai4	态態汰泰溙肽酞鈦钛
tan1	坍怹摊滩瘫癱舑貪贪
tan1 tian3	舔
tan2	坛婒憛曇榃痰罈藫談譚譠谈谭貚郯醰
tan2 tan4	埮
tan2 ti2	鷤
tan2 xian1	锬
tan2 xian1 yan3	錟
tan2 xun4	蕈
tan2 yan2 yan4	炎
tan2 yu4	昙
tan3	嗿坦憳暺毯菼醓鉭钽
tan3 zhan4	袒
tan4	嘆歎湠炭碳舕賧
tan4 xian2	探
tan4 yi3 you4	叹
tang1	羰薚蝪铴鼞
tang1 tang2	膛鏜镗
tang1 tang3	耥
tang1 tang4	鐋
tang2	唐堂塘搪棠榶溏漟煻瑭磄糖蓎螗螳赯醣鎕鶶
tang2 xing2	餳饧
tang3	傥戃曭爣矘鎲钂
tang3 tang4	躺
tang4	摥烫
tao1	嫍幍弢慆搯槄涛滔絛縚绦韬饕
tao1 tao2	掏
tao1 tao4	韜
tao1 yao3	抭
tao2	啕淘祹綯萄蜪逃醄鋾鞀駣騊鼗
tao2 tiao1 zhao4	桃
tao2 tiao4	咷
tao2 tiao4 yao2 yao4	姚
tao2 yao2	匋
tao3	討讨
tao3 tao4	套
te4	特蟘貣鋱铽
te4 tei1 tui1	忒
te4 teng2	螣
te4 zhi2	犆職
teng1 tong1	熥
teng2	滕疼籐縢腾藤誊謄邆騰
teng4	霯
ti1	锑鷈
ti1 ti2	梯銻鵜
ti1 ti3	體
ti1 ti4	剔
ti1 zhai1 zhi4	擿
ti2	偍厗啼崹稊緹缇蕛趧鍗题騠鯷鶙鹈
ti2 ti3	醍
ti2 ti4	綈绨
ti2 yi2	桋荑
ti4	剃嚏屉屜悌悐惕替殢洟涕瓋籊褅逖
ti4 xi1	裼錫
ti4 yao4 yue4	趯
ti4 yue4	躍
ti4 zhi4	薙
tian1	天婖酟
tian1 tian4	添
tian1 tun1	吞
tian2	屇恬沺湉甜田畋磌窴闐阗鷏
tian2 tian3	餂
tian2 tian4	菾
tian2 yun2	畇
tian2 zhen1 zhen4	鎮
tian2 zhi4	寘
tian3	倎忝悿晪殄淟腆賟
tian3 tian4	琠
tian3 ting3	娗
tian3 tun3	錪
tian4	掭睼
tian4 zhen4	瑱
tiao1	庣祧
tiao1 tiao2	條
tiao1 tiao3	窕
tiao1 yao2	恌
tiao2	岧条祒芀迢鎥鞗髫鰷鲦齠龆
tiao2 tiao3 tiao4	趒
tiao2 xiao1 xiu1 you3	脩
tiao2 xiu1	蓨
tiao3	宨窱脁
tiao3 tiao4 you2	朓
tiao3 tou3	斢
tiao4	眺粜覜
tiao4 yao4	艞
tie1	萜貼贴
tie1 tie3 tie4	帖
tie1 zhan1	怗
tie1 zhan1 zhan4	占
tie1 zhe2	聑
tie3	蛈铁驖
tie3 yi2	銕
tie4	餮
ting1	厅廳烃綎聽
ting1 ting2	渟
ting1 yi2 yin3	听
ting1 ying2	桯
ting2	亭停婷嵉庭廷楟榳筳聤蝏霆鼮
ting2 ting3	挺莛閮
ting3	侹圢烶珽脡艇頲
ting3 ting4	梃
tong1	嗵炵蓪
tong1 tong2	痌
tong1 tong4	通
tong1 yong3	恿
tong2	仝佟哃彤曈氃浵犝瞳砼粡膧茼鉖銅铜餇鮦
tong2 tong4	同
tong2 wei3 wei4	蜼
tong2 xiong2	赨
tong2 zhong1	童
tong2 zhong3 zhong4	穜
tong2 zhuang4	獞
tong3	捅桶統统
tong4	恸慟痛
tou1	偷
tou1 yu2	媮
tou1 yu2 yu3	愉
tou2	亠
tou2 tou5	头頭
tou2 xu1 yu2	緰
tou2 yu2	褕
tou3	妵敨紏蘣黈
tou3 yu4	諭
tu1	凸唋嶀捸涋湥禿秃突葖鵚鼵
tu2	图圖屠峹嵞廜徒瘏筡蒤途酴鍎駼鵌鶟鷋鷵
tu2 tu4	菟
tu2 xu2 yu2 yu4	余
tu2 yi4	墿
tu2 yu2	悇
tu2 zha1	潳
tu3	釷钍
tu3 tu4	吐
tu4	堍鵵
tuan1	煓
tuan1 tuan4	貒
tuan1 zhuan1	湍
tuan2	慱抟糰鏄鷒鷻
tuan2 tuo2 zhuan1	磚
tuan2 zhuan1	塼嫥漙篿
tuan2 zhuan1 zhuan4	剸摶
tuan3	疃
tuan3 tun3	畽
tuan4	褖
tui1	推蓷藬
tui2	弚穨蹪隤頹颓
tui2 tui3	僓
tui3	俀腿
tui4	煺蛻退駾
tui4 tun4	褪
tui4 tuo1	侻脱
tui4 yue4	蜕
tun1	暾
tun1 wu2	吴
tun1 yun1	涒
tun1 zhun4	旽
tun2	臀軘饨魨
tun2 zhun1	屯窀
tun2 zhun4	飩
tuo1	侂托挩脫莌託飥魠
tuo1 tuo2 tuo4 yi2	佗
tuo1 zhe2	乇馲
tuo2	堶岮沲砣碢紽跎駝驒驼鮀鴕鸵鼉鼍
tuo2 tuo3	袉
tuo2 yi2	坨
tuo2 yi2 yi3	迆迤
tuo2 yi2 yi4	袘
tuo2 yi2 zhi4	阤
tuo3	妥嫷庹椭
tuo3 wei3	撱
tuo4	唾柝毤毻箨籜
tuo4 ze2	蘀
wa1	娲媧挖溛漥窊窪
wa1 wu1 yu1 yu2	汙
wa1 xie2	鞋
wa1 ya4	穵
wa1 yi1	黳
wa3	佤
wa3 wa4	瓦
wa4	嗢腽膃襪
wai1	喎
wai1 wai3	歪
wai1 wo4 yao1	夭
wai3 wei1 wei3	崴
wai4	外
wan1	剜弯彎湾潫灣豌
wan1 wan3	蜿
wan1 wan3 wan4	睕
wan1 wan3 wan4 yu4	捥
wan1 wan3 yuan1 yuan3	鋺
wan1 wan3 yuan1 yuan4	夗
wan2	丸刓岏抏烷玩紈纨芄顽
wan2 wan4	忨翫
wan2 wei3	骫
wan2 yuan2	园蚖
wan3	倇婉惋挽晚晥晼琬碗綩綰绾輓
wan3 wo4	踠
wan3 wo4 yuan1	涴
wan3 yu4 yuan1	惌
wan3 yu4 yuan1 yun3	宛
wan3 yu4 yun4	菀
wan3 yuan1	箢
wan3 yuan3	畹
wan4	卍瞣腕萬蟃鋄
wan4 wen4	脕
wan4 xian4	莧
wan4 yuan2	妧
wan4 yuan3	輐
wang1	尪
wang1 wang3	瀇
wang1 you2	尢
wang2	莣
wang2 wang3	罔
wang2 wang4	妄忘
wang2 wang4 yu4	王
wang2 wu2	亡
wang3	惘網网菵輞辋魍
wang3 wang4	往暀
wang4	旺望朢
wei1	偎危威巍微愄揋椳渨烓燰葨葳薇蝛覣詴逶隇隈
wei1 wei2 wei4	魏
wei1 wei3	蜲
wei1 wei3 wei4	委畏萎
wei1 wo1 wo3	倭
wei1 yu4	煨
wei2	围圍帏帷幃沩洈涠湋溈潍潿濰犩癓维蓶覹违鄬鍏闈闱霺韦鮠
wei2 wei3	唯寪峗峞嵬惟
wei2 wei4	为喡為
wei2 wu4	阢
wei2 xi1	觿
wei2 xu1 yu1 yu2	于
wei2 xu1 yu2	圩
wei2 yi2	維
wei2 zhui4	醀
wei2 zui4	欈
wei3	伟伪偉儰壝娓崣徫斖暐洧浘濻炜玮瑋痿緯纬腲艉芛苇葦諉诿鍡韙韪頠鮪鲔
wei3 wei4	猥碨
wei3 xue1	韡
wei3 yan3	沇
wei3 yi3	尾
wei3 you3 you4	有
wei3 you4 yu4	痏
wei3 yuan3	薳
wei4	卫喂媦慰未渭煟犚猬罻胃菋藯蘶蝟衛褽謂讆谓躗軎鏏霨餵饖鮇
wei4 yi2	遗
wei4 yu4	蔚
wei4 yu4 yun4	尉熨
wen1	塭殟溫豱轀
wen1 wo4 yun1	瘟
wen1 yun3	褞
wen1 yun4	温韞
wen2	文炆芠蚊閺閿闅闻阌雯駇魰鳼
wen2 wen4	紋纹聞鼤
wen3	刎吻抆桽稳穩
wen3 wen4	紊
wen3 xian4	限
wen3 yan3	眼
wen3 yun3 yun4	愠
wen4	問妏搵璺问
weng1	螉鶲
weng1 weng3	嗡滃翁
weng3	塕暡瞈聬蓊
weng4	瓮甕罋齆
weng4 yong1	壅蕹
wo1	猧窝窩莴萵蜗
wo1 zhua1	挝撾
wo3	婐我
wo4	仴偓卧幄沃濣瓁瞃肟腛臥雘齷龌
wo4 wu4	杌
wo4 yue4	臒
wo4 yun1	馧
wu1	剭呜圬屋巫杇污窏螐誣诬邬鄔鎢钨鴮
wu1 wu4	乌兀嗚
wu1 wu4 ya1	烏
wu1 yang1	歍
wu1 yu1	扜盓
wu1 yu1 yu2	於
wu1 yu2	杅
wu2	洖浯珸芜莁蜈鯃鷡鼯
wu2 wu3	俉廡憮捂橆牾蕪
wu2 wu4	唔
wu2 wu4 yu3	梧
wu2 ya2 yu2	吾
wu2 yu2	吳郚
wu2 yu2 yu3	鋙
wu2 yu3	峿齬
wu3	五仵伍侮倵午呒啎妩嫵庑怃摀武潕玝甒碔舞躌鵡鹉
wu3 wu4	塢忤迕逜
wu4	务卼坞寤屼岉嵨悟戊扤晤焐物矹粅誤误鋈雾靰騖骛鹜齀
xi1	俙僖兮凞吸嘻奚屖嶲巇希徆息悉悕惁惜晞晰曦桸榽樨橀欷氥汐浠淅烯焟熄熹燨爔牺犀琋瘜皙睎硒礂稀穸窸粞緆羲翕膝舾莃蒠蜥蟋蠵西譆豨豯貕鄎酅醯釸锡雟鵗鼷
xi1 xi2	徯
xi1 xi3	嬉禧
xi1 xi4	傒矽
xi1 xian4 xie2	脅
xi1 xie4	唏
xi1 xin1 yin2	訢
xi1 ya4	潝
xi1 yi2	咦媐熙
xi1 yi2 yi4	義
xi1 yi4	夕羛
xi2	习媳嶍席檄習蓆袭襲覡觋郋鎴霫飁騱騽驨鰼
xi2 xi3 xia4	謑
xi2 xiao4	薂
xi2 xie4	隰
xi2 yi4	蜴
xi3	囍屣枲漇玺璽縰葸蓰蟢蹝
xi3 xian1 xian3	銑
xi3 xian3	洗铣
xi3 yi3	歖
xi4	係卌屭忥怬恄潟熂禊細綌细蕮衋覤赩郤釳阋隙餼饩黖
xi4 xie2	慀
xia1	瞎颬
xia1 xia2	魻
xia1 xia4	煆
xia1 ya1 ya5	呀
xia1 ya2	岈
xia2	侠俠匣峡峽烚狎狭狹珨瑕硖硤碬祫縖舝舺蕸赮辖遐鍜陜霞騢鶷黠
xia4	下罅鏬
xian1	仚佡僊先嘕奾屳廯忺憸暹氙珗祆秈籼莶褼跹躚酰锨韱馦鶱
xian1 xian3	仙搟鲜
xian1 xian3 xian4	鮮
xian1 zhen1	枮
xian2	伭啣娴娹嫌嫻弦澖痫癇胘舷蚿蛝衔誸贤銜閑闲鷳鷴鹇
xian2 xian4	憪賢
xian2 xin2	礥
xian2 xu4 xuan2	妶
xian2 xuan2 xuan4	玹
xian2 xuan4	絃
xian2 xun2	撏
xian2 yan2	麙
xian2 yi3	矣
xian3	尟幰攇显毨灦烍猃獫玁禒筅藓蘚蚬譣赻鍌险韅
xian3 xian4	憲蜆顯
xian3 yan3	嶮
xian4	僩县姭岘峴撊晛瀗献现現睍粯糮線线羨腺苋豏鋧陷馅鼸
xian4 xiong4	宪
xian4 xuan2	縣
xian4 yan2	綖
xian4 yan2 yi2	羡
xian4 zhi3	黹
xiang1	乡厢廂湘瓖箱緗缃膷芗葙襄镶香驤骧
xiang1 xiang3	薌
xiang1 xiang3 xiang4	鄉
xiang1 xiang4	相
xiang2	庠祥翔详
xiang2 yang2	詳
xiang2 yang2 yang3	洋
xiang3	享响想晑蠁響飨餉饗饟饷鯗鲞
xiang3 xiang4	嚮
xiang4	像向姠橡缿萫蟓襐象鐌項项鱌
xiang4 yang4	樣
xiao1	哓嘵宵庨枭枵梟歊毊消潇瀟灱猇獢痚痟窙箫绡膮萧蕭虈虓蟂蠨逍銷销驍骁髇髐魈鴞鷍
xiao1 xiao3	簫
xiao1 xiao4	肖霄
xiao1 xiao4 xue1	哮
xiao1 xiu1	烋
xiao1 xiu1 xu3 xu4	咻
xiao1 yao4	獟
xiao2	洨淆
xiao2 xiao4 yao2	殽
xiao2 yao2	崤
xiao3	小晓曉筱篠
xiao4	傚啸孝效涍熽笑詨
xiao4 xue2	澩
xiao4 yao2	爻
xiao4 yao3	鷕
xie1	蠍
xie1 xie4	楔
xie1 ya4	歇
xie2	勰协協嗋垥愶拹携撷擷攜熁燲瑎緳纈缬胁蝢襭諧谐龤
xie2 ye1 ye2	耶
xie2 ye4	叶鍱頁
xie3 xie4	写寫
xie3 xue4	血
xie4	亵伳偰卸媟屑屧廨懈械榍榭泻澥瀉瀣灺焎燮祄繲绁薢薤蟹褉褻謝谢躞邂韰齂齘齥
xie4 xu1	蝑
xie4 ye4 zha2	偞
xie4 yi4	枻泄洩紲絏
xin1	妡心忻新杺欣歆炘盺薪辛锌馨馫
xin1 xin4	芯
xin1 xuan1	昕
xin1 xun4	鑫
xin1 zi3	鋅
xin2	枔襑鐔
xin2 xun2	寻尋
xin4	囟焮舋衅釁阠
xin4 xing1 xing4	興
xin4 yin2 yin4	憖
xin5	忄
xing1	垶惺星煋猩瑆腥蛵觲騂
xing1 xing4	兴
xing1 ying1 ying2	嫈
xing2	侀刑型娙形洐鈃鉶陉
xing2 yan2 yan4	研
xing2 ying1 ying2	滎
xing2 ying2	荥
xing3	擤
xing4	倖婞性悻杏涬荇莕
xiong1	兇凶匈忷恟汹洶胸
xiong2	熊雄
xiong3 xu4	昫
xiong4	敻詗
xiu1	修庥樇羞脙臹貅銝鎀饈馐髹鵂鸺
xiu1 xu4	休煦
xiu2	苬
xiu3	朽滫潃糔
xiu4	嗅岫珛琇秀繡绣螑袖鏽锈
xiu4 you3	莠
xiu4 you4	褎
xu1	噓墟嬃幁旴楈欨歔盱窢縃蕦虚虛諝須頊须顼驉鬚魆魖
xu1 xu3	姁稰胥訏
xu1 xu3 xu4	湑
xu1 xu4 yu2 yu3 yu4	藇
xu1 yu1 yu4	吁
xu1 yu2	謣
xu1 yu2 yu3 yu4	芋
xu1 yu2 yu4	雩
xu2	徐
xu3	冔喣暊珝糈詡诩鄦醑
xu3 yu3	栩
xu4	侐勗叙垿婿序恤敘旭殈沀溆漵烅烼瞁緒續绪续蓄藚訹酗
xu4 xue4	怴瞲
xu4 yi4	洫
xu4 yu2	鱮
xu4 yu3	嶼
xu4 yu4	淢獝
xu4 zhu4	芧
xuan1	媗宣愃愋揎昍暄煊瑄禤翾萱萲蓒蝖蠉諠諼谖轩鍹駽
xuan1 xuan2	儇
xuan1 xuan3	咺喧晅
xuan1 xuan4	矎
xuan1 yuan1	蜎
xuan2	嫙悬懸漩璇璿痃蜁
xuan2 xuan4	旋玄鏇
xuan2 zi1	玆
xuan3	癣癬选
xuan3 zhuan4	饌
xuan4	昡楦渲炫琄碹縼绚蔙衒袨讂贙鉉铉镟
xuan4 xun2	洵絢
xuan4 yuan2	楥
xue1	疶蒆薛靴
xue2	学岤嶨泶燢袕鷽
xue3	雪鱈鳕
xue4	狘謔谑
xun1	勋勛勳埙塤曛燻獯矄纁臐蔒薰醺
xun1 xun4	壎熏
xun1 yin1 yin4	窨
xun1 yun2	篔
xun2	噚峋循揗攳浔燅珣璕紃荀蟳詢询鄩馴鱘鲟
xun2 xun4	侚驯
xun2 yan4	爓
xun2 yin2	潯蟫
xun4	噀徇愻殉汛訊訓训讯迅迿逊遜
xun4 ze4	稄
xun4 zhuan4	巽
ya1	丫垭孲桠鴨鸦鸭
ya1 ya2 ya3	雅
ya1 ya2 ya4 ye1	枒
ya1 ya3	哑鴉
ya1 ya3 ya4	婭
ya1 ya4	压壓錏
ya1 yan1 yan3 yan4 yi4	厭
ya2	伢堐崖涯琊睚芽蚜
ya2 ya3	庌
ya2 ya4	牙玡齖
ya2 yu2 yu4	衙
ya3	厊痖蕥
ya3 ya4	掗
ya4	亚圔圠娅揠氩氬犽砑聐襾訝讶迓
ya4 yan4	椻
ya4 ye1	窫
ya4 yi4	浥
ya4 yu4	御
ya4 zha2	札
yan1	偣嫣崦恹懨漹煙珚胭臙鄢閹阉黫
yan1 yan3	奄淹郾
yan1 yan4	嬮燕
yan1 yan4 ye4	殗
yan1 yan4 ye4 yuan1	咽
yan1 yan4 yin4	傿
yan1 ye1 yin1	洇
yan1 yi2	焉
yan1 yin1	湮烟
yan1 yin1 yin3	殷
yan1 yu1 yu4	菸
yan1 zhen3	黰
yan2	严壛壧妍娮岩巖延揅楌狿盐碞筵簷莚虤讠郔閆闫阎顏颜
yan2 yan3	嚴孍礹衍
yan2 yan3 yan4	沿閻
yan2 yan4	贗鹽
yan2 yan4 yin2	言
yan2 yin1	氤
yan2 yuan2	芫
yan3	俨偃儼兖兗厣厴噞巘愝扊抁揜曮椼渰琰甗罨蝘褗隒魇魘鰋鶠黤黭黶鼴鼹齞齴龑
yan3 yan4	匽喭嵃掩棪演躽酀
yan3 yan4 yin3	酓
yan3 ye4	靨
yan3 yin2 yin3	齗
yan3 yin3	縯
yan3 you3	戭
yan3 yun3	阭
yan4	厌唁嚥堰姲嬿宴彥晏曣滟灩焰燄牪猒砚硯艳艷觾諺讌讞谚谳豔赝酽醼釅雁餍饜騴驗驠验鬳鴈鷃鷰
yan4 yao2 yin2	淫
yan4 yi4	焱
yan4 zhe4 zhei4	這
yang1	姎抰殃泱秧胦鉠雵鴦鸯
yang1 yang3	佒
yang1 yang3 yang4	鞅
yang1 yang4	怏
yang1 ying1	央英霙
yang2	佯垟崸徉扬揚昜暘杨楊炀珜疡眻羊鍚鐊阳陽颺鸉
yang2 yang3	痒蛘
yang2 yang4	样烊煬
yang3	养坱岟懩攁氧炴癢紻蝆軮
yang3 yang4	瀁養
yang3 yang4 ying1	柍
yang3 ying4	映
yang4	恙漾羕
yao1	吆喓殀祅腰訞邀
yao1 yao3	宎葽
yao1 yao3 yao4	要
yao1 you2	由
yao1 yue1	约
yao2	傜嗂垚堯媱尧嶢徭搖摇摿榣烑猺珧瑤瑶窑肴謠谣轺遙遥餚鰩鳐
yao2 yao4	愮颻鷂
yao2 you2	猶
yao2 you2 zhou4	繇
yao3	偠岆杳柼榚溔窅舀苭騕
yao3 yao4	崾穾窈窔
yao3 zhuo2	蓔
yao4	曜筄耀药葯袎覞詏靿鹞
yao4 you1	怮
yao4 you4	幼
yao4 yue4	瀹鑰钥
ye1	暍椰蠮
ye1 ye4	掖
ye2	揶擨爷爺铘
ye2 yu2	餘
ye3	冶埜漜
ye3 yi2	也
ye4	业夜嶪捙擛擫晔曄曳業歋澲烨燁瞱腋谒鄴鐷靥页饁
ye4 yue4	黦
ye4 zha2	煠
ye4 zhuai1 zhuai4	拽
yi1	伊咿嫛檹毉洢漪瑿禕稦蛜衤郼銥铱黟
yi1 yi2 yi4	一
yi1 yi3	依椅醫
yi1 yi4	億医意懿繄衣鷖
yi1 yin1	壹
yi1 you3	黝
yi2	仪侇儀匜圯夷姨宜宧寲峓彝怡恞暆栘椸熪瓵痍簃羠胰萓蛦衪觺诒貽贻跠迻鏔頤顊颐饴鸃
yi2 yi3	嶬酏
yi2 yi4	异貤
yi2 yin2	沂
yi3	偯崺扆敼旖檥礒舣艤苡蚁螘轙釔鉯钇顗鳦
yi3 yi4	臆陭
yi4	义亄亦亿伿佾俋刈劓劮勩呓唈囈圛垼埸奕嫕寱峄嶧帟帠廙弈弋役忆怿悒憶懌抑挹易晹曀杙枍槸檍殔殪毅浂溢潩澺瀷焲熠熤熼燚燡燱玴異疫瘗瘞瘱癔益縊繶绎缢羿翊翌翳翼耴肊膉艗艺芅蓺薏藙藝蘙衵裔裛襼詍詣誼譯議议译诣谊豷贀跇轶逸釴鎰鐿镒镱隿霬靾驛驿鶂鷁鷊鷾黓齸
yi4 yin1	欭
yi4 yin4	印
yi4 ze2 zhai2	擇
yi4 zhi1 zhi3	栺
yi4 zhi2	樴
yin1	凐噾因垔堙姻愔慇歅禋絪茵蒑裀諲銦铟闉阴霒霠音韾駰
yin1 yin3 yin4	喑
yin1 yin4	瘖荫蔭
yin2	嚚圁夤婬寅崟檭殥烎狺苂荶蔩誾鄞銀银霪鷣
yin2 yin3	螾
yin2 you2	冘
yin2 zhong4	众
yin3	引朄檃濦瘾癮蘟蚓讔趛鈏隐靷
yin3 yin4	廴隱飲饮
yin3 yun2	尹
yin4	垽廕湚猌胤茚酳
yin5	粌
ying1	偀嘤嚶婴撄攖朠樱櫻渶煐瑛璎瓔甇甖碤礯纓缨罂罃罌膺莺蘡蝧蠳譻賏韺鶧鶯鷹鸚鹦鹰
ying1 ying4	嬰应應褮
ying2	塋嬴攍楹滢潆濴瀛瀠瀯盈籯縈茔荧莹萤营萦蓥藀蝇螢蠅覮贏赢
ying2 ying3	瑩
ying2 ying3 ying4	瀴
ying2 ying4	迎
ying2 yong3	禜
ying3	廮影摬梬潁瘿癭矨穎颍颖
yo1 yo5	哟喲
yo1 yu4	唷
yo1 yu4 zhou4	育
yong1	嗈墉嫞廱慵拥擁槦滽灉痈癰臃郺鄘鏞镛雍雝饔鳙鷛
yong1 yong2	庸
yong1 yong3	噰澭邕
yong1 yong4	佣
yong2	鰫
yong2 yong3	嵱
yong2 yu2	喁顒
yong3	俑勇咏埇塎悀永泳湧蛹詠踊踴
yong4	用醟
you1	優呦嚘幽悠憂攸櫌瀀纋耰鄾麀
you1 you2	优逌
you1 you3	懮
you1 you4	忧
you2	偤尤沋猷秞莸蕕蝣訧輶遊邮铀魷鱿
you2 you3	庮楢
you2 you4	油犹疣
you2 you4 zhou2	柚
you2 zhou4	鈾
you2 zhu2	蚰
you3	卣友牖羑聈苃酉銪铕
you3 yu4	栯
you4	佑侑又右囿姷宥峟狖祐誘诱貁迶釉鼬
you5	蒏
yu1	唹淤瘀箊纡迂陓
yu1 yu2	渝
yu1 yu3	穻
yu2	堣堬妤娛娱崳嵎嵛愚旟楰榆欤歈歟歶渔湡漁澞牏狳玗瑜璵盂睮硢竽籅羭腴舁舆艅萸蕍蘛虞蝓螸衧覦觎諛谀邘隅雓馀魚鮽鰅鱼鸆
yu2 yu3	庾窳
yu2 yu3 yu4	与與
yu2 yu3 zhu4	予
yu2 yu4	喻禺輿
yu3	伛俁俣偊傴噳圄圉宇寙屿斔斞楀瑀祤禹蘌貐鄅麌龉
yu3 yu4	敔瘐語语雨
yu4	噊域堉妪寓峪彧愈慾戫昱棜棫欲毓浴淯澦灪煜燏爩狱獄玉瘉癒砡礜禦稢篽籲緎罭聿肀蒮蓣蓹蕷袬裕誉譽谕軉輍轝遹郁鈺鋊錥钰閾阈預预飫饇饫馭驈驭鬱魊鱊鳿鴥鵒鸒鹆鹬
yu4 yuan1 yuan4 yun4	苑
yu4 zhou1	粥
yuan1	冤嬽棩淵渊灁眢葾蒬駌鳶鴛鵷鸢鸳鼘
yuan1 yuan2	蝝
yuan1 yun1	蜵
yuan2	元原圆園圓垣塬媴嫄榞榬橼櫞沅湲源溒爰猿獂笎缘羱蝯螈袁轅辕邍邧鎱騵鶢黿鼋
yuan2 yuan4	媛杬緣褑
yuan2 yun2 yun4	员員
yuan2 yun3	允隕
yuan3	远
yuan3 yuan4	遠願
yuan4	噮妴愿禐肙裫院
yuan4 yun4	怨
yue1	曰矱
yue4	刖岳嶽悅悦戉抈樾爚玥礿禴籥粤粵蘥蚎跃軏鈅鉞钺閱阅鸑鸙龠
yun1	奫氳頵
yun1 yun2	氲
yun1 yun4	晕暈
yun2	云伝勻妘昀沄澐熉紜縜纭耘蕓郧鄖雲
yun2 yun3	溳荺
yun2 yun4	芸
yun3	抎殒殞狁賱陨霣馻齫
yun3 yun4	运
yun4	孕恽惲慍枟熅縕蕴薀蘊運郓鄆酝醞韗韫韵韻
za1	匝咂鉔
za1 zan1	臢
za1 zan3	拶
za1 zha1	紮
za1 zha1 zha2 zha3	扎
za2	砸雜雥
za2 za3 zan2 zan5	咱
za2 za4 zan2 zan3 zan5	喒
za2 zan2 zan5	偺
za3 ze2 zha1 zha4	咋
zai1	哉渽災灾賳
zai1 zai4	栽
zai1 zi1	甾
zai1 zi1 zi4	菑
zai3	宰崽
zai3 zai4	载
zai3 zi1 zi3	仔
zai4	再在
zai4 zeng1	縡
zai4 zui4	酨
zan1	糌鐕
zan1 zan3	簪
zan3	儹寁昝趱
zan3 zu1	趲
zan3 zuan4	揝
zan4	暂暫瓒瓚禶讚贊赞錾鏨饡
zang1	牂贓赃
zang1 zang3	髒
zang1 zang4	脏
zang3	驵
zang3 zu3 zu4	駔
zang4	臟葬
zang4 zhuang3	奘
zao1	糟蹧遭
zao2 zao4 zu2 zuo4	鑿
zao2 zuo4	凿
zao3	早枣棗璪藻
zao3 zhao3	蚤
zao4	唣噪灶煰皁皂譟趮躁
ze2	则則啧嘖帻樍泽箦舴蠌謮賾责赜鸅
ze2 zha4 zuo2	笮
ze2 zha4 zuo4	柞
ze2 zhai2	择
ze2 zhai4	簀責
ze2 zhe2	謫
ze2 zhuo2	矠
ze2 zuo4	葃迮
ze4	仄崱庂捑昃
ze5	伬
zei2	蠈賊贼
zen3	怎
zen4	谮
zeng1	憎璔矰磳罾
zeng1 zeng4	缯
zeng3 zong1	鬷
zeng4	甑贈赠锃
zeng4 zong1	综
zeng4 zong1 zong4	綜
zha1	哳抯挓揸樝渣譇齄齇
zha1 zha2	劄
zha1 zha4	吒溠
zha1 zu1 zu3	柤
zha2	蚻譗鍘铡闸
zha2 zha4	炸
zha3	眨
zha3 zha4	鮓
zha3 zha4 zuo2	砟苲
zha3 zhai3	厏
zha4	咤搾榨痄蚱詐诈醡
zha4 zuo4	乍怍
zhai1	捚摘斋齋
zhai3	窄
zhai4	债債砦
zhai4 zhi4	豸
zhan1	惉旃栴毡氈瞻薝蛅譫谵霑饘魙鸇
zhan1 zhan4	站邅驙
zhan3	嫸展崭搌斩琖盏盞醆颭
zhan3 zhan4	斬
zhan4	偡战戰栈綻绽蘸虥輚轏驏
zhang1	傽嫜张彰慞暲樟漳獐璋粻蟑遧騿鱆
zhang1 zhang3 zhang4	漲
zhang1 zhang4	張章鄣障
zhang3	仉掌
zhang3 zhang4	涨
zhang4	丈仗墇嶂帐帳幛扙杖瘴瞕粀胀賬账
zhao1	妱盄釗鉊鍣钊駋
zhao1 zhao2 zhe5 zhuo2	着
zhao1 zhao3 zhao4	炤
zhao1 zhao4	昭詔
zhao3	沼瑵
zhao3 zhua3	爪
zhao4	兆垗旐曌照狣笊罩肇诏赵鮡
zhao4 zhuo1	棹
zhao4 zhuo2	啅
zhe1	嫬遮
zhe1 zhe2	蜇
zhe2	哲悊砓磔粍虴蛰蟄謺讋谪輒轍辄辙鮿
zhe2 zhi2	慹
zhe2 zhi4	晢鷙
zhe2 zou1	陬
zhe3	者赭锗
zhe4	柘浙淛蔗蟅鷓鹧
zhe4 zhei4	这
zhe4 zhi4	潪
zhen1	侦寊斟桢楨榛樼浈潧獉珍瑧真砧祯禛臻薽贞轃遉針针鱵
zhen1 zhen3 zhen4	振
zhen1 zhen3 zhun1	胗
zhen1 zhen4	揕
zhen1 zheng1	偵禎貞
zhen1 zheng4	帧
zhen3	抮畛眕縥缜袗裖診诊軫轸駗鬒
zhen4	挋敶朕栚眹紖絼誫賑赈镇阵陣鴆鸩
zheng1	争姃媜峥崝崢征掙炡烝狰猙癥眐睁睜筝箏篜聇蒸鉦錚钲
zheng1 zheng3	糽
zheng1 zheng4	怔挣政正爭症諍铮
zheng3	拯整晸
zheng4	塣幀証證证诤郑鄭
zhi1	卮搘栀梔椥榰祗禔秖秪织胑芝蘵蜘衼
zhi1 zhi2	戠
zhi1 zhi2 zhi3	指
zhi1 zhi3	只枳脂
zhi1 zhi4	掷擲智知稙織躓
zhi1 zhi4 zhu1	之
zhi2	侄值埴執姪嬂执摭植淔直絷縶职膱蟙跖踯躑馽
zhi2 zhi4	贄
zhi2 zhuo2	蹠
zhi3	咫址恉旨止汦沚淽疻祉紙纸芷藢趾軹轵酯阯
zhi3 zhi4	坁
zhi3 zhong1	夂
zhi4	偫制帙帜幟庢庤廌彘志懥懫挚摯晊栉桎櫍櫛洷滍滞瀄炙狾猘痔痣礩祑秩秷稚紩緻置翐膣蛭袟製覟觯觶誌質质贽跱踬輊轾銍鋕鑕駤騭骘鴙鸷
zhi4 zhui4	致
zhong1	伀妐彸忠柊炂籦終终舯蔠螤螽鍾鐘钟锺鼨
zhong1 zhong4	中衷
zhong3	冢塚尰煄肿腫
zhong3 zhong4	踵
zhong4	仲堹狆眾衶
zhou1	侜周喌州徟洲珘舟诌賙輈輖週銂
zhou1 zhou4	僽皺
zhou1 zhu1	侏
zhou1 zou1	諏
zhou2 zhou4	轴
zhou2 zhou4 zhu2	軸
zhou3	帚睭肘鯞
zhou3 zhu2	舳
zhou4	冑咒宙昼晝甃皱籀紂纣绉胄荮酎駎驟骤
zhou4 zhu4	注
zhou4 zhuo2	啄
zhu1	株槠橥櫧櫫洙潴瀦猪珠硃絑茱蛛蝫袾誅诛诸豬邾銖铢鮢鴸
zhu2	欘灟瘃竹笁茿蠋钃鱁
zhu2 zhu3	斸
zhu2 zhu4	筑築
zhu2 zhuo2	斀茁躅
zhu3	丶嘱囑拄渚煮瞩矚麈
zhu3 zhu4	主柱砫
zhu4	伫佇住壴嵀樦殶炷疰眝祩篫紸羜翥苎莇蛀註貯贮跓軴鉒鑄铸馵駐驻
zhu4 zhuo2	櫡箸
zhu4 zu3	阻
zhua1	抓檛膼髽
zhuai3 zhuan3 zhuan4	轉转
zhuan1	专瑼砖蟤諯鄟顓颛
zhuan4	啭囀瑑篆馔
zhuan4 zuan4	賺赚
zhuan4 zun1	僎
zhuang1	妆妝桩梉莊装裝
zhuang1 zhuang4	壯
zhuang4	壮撞焋状狀
zhui1	錐锥騅骓鵻
zhui3 zi3	沝
zhui4	坠墜甀畷縋缀缒膇諈贅赘轛醊鑆餟
zhun1	宒諄谆迍
zhun1 zhun4	訰
zhun3	准
zhun3 zhun4	稕綧
zhun3 zhuo2	準
zhuo1	倬拙捉桌棳蠿
zhuo1 zhuo2	卓涿
zhuo2	圴擢斲梲椓浊浞濁灼禚籗罬蠗諑诼酌镯鵫鷟
zhuo2 zuo2	琢
zi1	咨孜孳崰嵫栥椔淄秶紎緇缁諮谘貲赀资辎鄑鈭錙鎡锱髭鯔鲻鶅鼒龇
zi1 zi3	訾
zi1 zi3 zi4	芓
zi1 zi4	姿資輜
zi1 zui3	觜
zi3	姊杍梓滓矷秭笫籽紫耔訿釨
zi3 zi5	子
zi4	倳剚字恣渍牸眥眦胾自
zong1	倧宗嵕惾朡棕熧猣翪腙蝬豵踪蹤鍐騣鬃
zong1 zong3	稯
zong3	傯总摠蓗
zong4	昮瘲粽纵錝
zou1	棸緅诹邹驺鯫鲰黀齺
zou3	走
zu1	葅
zu2	哫箤踿镞
zu3	俎组詛诅靻
zuan1	躜
zuan1 zuan4	鑽钻
zuan3	籫纂纘缵
zuan4	攥
zui1	厜纗
zui3	嘴噿嶊嶵璻
zui4	晬檇檌祽絊罪醉
zun1	壿尊嶟樽繜遵鐏鳟鷷
zun1 zun4	鱒
zun3	噂撙譐
zun4	捘銌
zuo1 zuo2 zuo4	作
zuo2	昨稓筰
zuo3	佐左繓
zuo4	侳做坐岝座祚胙葄阼
"""
