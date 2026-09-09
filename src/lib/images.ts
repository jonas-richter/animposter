// Character artwork.
//
// Every entry was resolved from the corresponding Fandom wiki's own page image
// (MediaWiki `prop=pageimages`) and then verified to actually load in a browser
// - all 159 of them. The stored value is the path on Fandom's image CDN; the
// width suffix is appended at runtime so we always request a mobile-sized copy
// instead of a multi-megabyte original.
//
// If a link ever rots, the app falls back to the generated card automatically
// (see components/CharacterArt.tsx) - nothing ever renders broken.
// `npm run check:images` re-verifies every URL.

const CDN = 'https://static.wikia.nocookie.net/';
const WIDTH = 400;

/** Character name (as used in characters.ts) -> path on the Fandom CDN. */
const PATHS: Record<string, string> = {
  // --- One Piece ---
  'Roronoa Zoro': 'onepiece/images/5/52/Roronoa_Zoro_Anime_Post_Timeskip_Infobox.png',
  'Dracule Mihawk': 'onepiece/images/b/bf/Dracule_Mihawk_Anime_Infobox.png',
  'Portgas D. Ace': 'onepiece/images/4/4f/Portgas_D._Ace_Anime_Infobox.png',
  Sabo: 'onepiece/images/c/c2/Sabo_Anime_Infobox.png',
  Nami: 'onepiece/images/6/68/Nami_Anime_Post_Timeskip_Infobox.png',
  'Nico Robin': 'onepiece/images/b/bc/Nico_Robin_Anime_Post_Timeskip_Infobox.png',
  Sanji: 'onepiece/images/b/b6/Sanji_Anime_Post_Timeskip_Infobox.png',
  Zeff: 'onepiece/images/d/d9/Zeff_Anime_Infobox.png',
  Smoker: 'onepiece/images/c/c4/Smoker_Anime_Post_Timeskip_Infobox.png',
  Tashigi: 'onepiece/images/1/1e/Tashigi_Anime_Post_Timeskip_Infobox.png',
  Shanks: 'onepiece/images/6/66/Shanks_Anime_Infobox.png',
  'Silvers Rayleigh': 'onepiece/images/b/b1/Silvers_Rayleigh_Anime_Infobox.png',
  'Sir Crocodile': 'onepiece/images/f/fd/Crocodile_Anime_Infobox.png',
  'Donquixote Doflamingo': 'onepiece/images/7/7e/Donquixote_Doflamingo_Anime_Infobox.png',
  'Aokiji (Kuzan)': 'onepiece/images/d/d6/Kuzan_Anime_Post_Timeskip_Infobox.png',
  'Kizaru (Borsalino)': 'onepiece/images/1/14/Borsalino_Anime_Infobox.png',

  // --- Naruto ---
  'Sasuke Uchiha': 'naruto/images/2/21/Sasuke_Part_1.png',
  'Itachi Uchiha': 'naruto/images/e/e9/Itachi_Child_OL.png',
  'Naruto Uzumaki': 'naruto/images/d/d6/Naruto_Part_I.png',
  'Minato Namikaze': 'naruto/images/e/eb/Minato_Jonin.png',
  'Kakashi Hatake': 'naruto/images/2/27/Kakashi_Hatake.png',
  'Obito Uchiha': 'naruto/images/4/4a/Obito_Uchiha.png',
  'Sakura Haruno': 'naruto/images/6/64/Sakura_Part_1.png',
  Tsunade: 'naruto/images/6/62/Kid_Tsunade.png',
  'Neji Hyuga': 'naruto/images/7/7e/Neji_Part_I.png',
  'Hinata Hyuga': 'naruto/images/9/97/Hinata.png',
  Orochimaru: 'naruto/images/1/14/Orochimaru_Infobox.png',
  'Kabuto Yakushi': 'naruto/images/c/c9/Kabuto_Part_1.png',
  'Madara Uchiha': 'naruto/images/0/06/Kid_Madara.png',
  'Hashirama Senju': 'naruto/images/2/2e/Kid_Hashirama.png',
  'Rock Lee': 'naruto/images/9/97/Rock_Lee_Part_I.png',
  'Might Guy': 'naruto/images/3/31/Might_Guy.png',

  // --- Jujutsu Kaisen ---
  'Satoru Gojo': 'jujutsu-kaisen/images/e/ef/Satoru_Gojo_%28Anime_2%29.png',
  'Toji Fushiguro': 'jujutsu-kaisen/images/d/db/Toji_Fushiguro_%28Anime%29.png',
  'Yuji Itadori': 'jujutsu-kaisen/images/3/35/Yuji_Itadori_%28Anime_4%29.png',
  'Aoi Todo': 'jujutsu-kaisen/images/7/79/Aoi_Todo_%28Anime%29.png',
  'Ryomen Sukuna': 'jujutsu-kaisen/images/7/74/Sukuna_%28Volume_29%29.png',
  Mahito: 'jujutsu-kaisen/images/4/4e/Mahito_%28Anime%29.png',
  'Nobara Kugisaki': 'jujutsu-kaisen/images/d/dd/Nobara_Kugisaki_%28Anime_2%29.png',
  'Maki Zenin': 'jujutsu-kaisen/images/2/2c/Maki_Zen%27in_%28Anime_4%29.png',
  'Kento Nanami': 'jujutsu-kaisen/images/b/b0/Kento_Nanami_%28Anime%29.png',
  'Mei Mei': 'jujutsu-kaisen/images/a/a8/Mei_Mei_%28Anime_2%29.png',
  'Yuta Okkotsu': 'jujutsu-kaisen/images/e/e6/Yuta_Okkotsu_%28Anime_2%29.png',
  'Suguru Geto': 'jujutsu-kaisen/images/c/c2/Suguru_Geto_%28Prequel_Anime%29.png',
  Kenjaku: 'jujutsu-kaisen/images/2/2b/Kenjaku_%28Anime%29.png',
  Panda: 'jujutsu-kaisen/images/4/4f/Panda_%28Anime_3%29.png',
  'Kokichi Muta (Mechamaru)': 'jujutsu-kaisen/images/e/ea/Kokichi_Muta_%28Anime%29.png',

  // --- Attack on Titan ---
  'Eren Jäger': 'shingekinokyojin/images/6/69/Eren_Yeager_character_image.png',
  'Zeke Jäger': 'shingekinokyojin/images/c/c8/Zeke_Yeager_character_image.png',
  'Mikasa Ackerman': 'shingekinokyojin/images/f/f7/Mikasa_Ackerman_character_image.png',
  'Levi Ackerman': 'shingekinokyojin/images/9/94/Levi_Ackerman_character_image.png',
  'Reiner Braun': 'shingekinokyojin/images/0/0f/Reiner_Braun_character_image.png',
  'Bertholdt Hoover': 'shingekinokyojin/images/0/02/Bertolt_Hoover_character_image.png',
  'Armin Arlert': 'shingekinokyojin/images/2/23/Armin_Arlert_character_image.png',
  'Erwin Smith': 'shingekinokyojin/images/1/18/Erwin_Smith_character_image.png',
  'Annie Leonhart': 'shingekinokyojin/images/2/2e/Annie_Leonhart_character_image.png',
  'Pieck Finger': 'shingekinokyojin/images/5/58/Pieck_Finger_character_image.png',
  'Historia Reiss': 'shingekinokyojin/images/9/9f/Historia_Reiss_character_image.png',
  'Frieda Reiss': 'shingekinokyojin/images/d/db/Frieda_Reiss_character_image.png',
  'Jean Kirschstein': 'shingekinokyojin/images/f/f0/Jean_Kirstein_character_image.png',
  'Marco Bodt': 'shingekinokyojin/images/4/4f/Marco_Bott_character_image.png',
  'Grisha Jäger': 'shingekinokyojin/images/6/61/Grisha_Yeager_character_image.png',
  'Eren Kruger': 'shingekinokyojin/images/5/50/Eren_Kruger_character_image.png',

  // --- Demon Slayer ---
  'Tanjiro Kamado': 'kimetsu-no-yaiba/images/0/05/Tanjiro_anime_right_face.png',
  'Giyu Tomioka': 'kimetsu-no-yaiba/images/4/43/Giyu_anime_design.png',
  'Zenitsu Agatsuma': 'kimetsu-no-yaiba/images/4/4f/Zenitsu_anime_right_face.png',
  'Inosuke Hashibira': 'kimetsu-no-yaiba/images/d/d4/Inosuke_anime.png',
  'Kyojuro Rengoku': 'kimetsu-no-yaiba/images/d/de/Kyojuro_anime_right_face.png',
  'Sanemi Shinazugawa': 'kimetsu-no-yaiba/images/3/3f/Sanemi_Shinazugawa_Full_Body_%28Anime%29.png',
  'Muzan Kibutsuji': 'kimetsu-no-yaiba/images/0/0e/Muzan_Kibutsuji_Full_Body_%28Anime%29.png',
  Kokushibo: 'kimetsu-no-yaiba/images/5/5f/Kokushibo_back_facing.png',
  'Shinobu Kocho': 'kimetsu-no-yaiba/images/e/e5/Shinobu_anime.png',
  'Kanao Tsuyuri': 'kimetsu-no-yaiba/images/0/02/Kanao_anime_right_face.png',
  Akaza: 'kimetsu-no-yaiba/images/9/99/Akaza_IC_anime_render.png',
  Douma: 'kimetsu-no-yaiba/images/2/24/Anime_Doma%27s_cult_wear.png',
  'Nezuko Kamado': 'kimetsu-no-yaiba/images/0/0e/Nezuko_anime_right_face.png',
  Tamayo: 'kimetsu-no-yaiba/images/1/19/Tamayo_anime.png',
  'Tengen Uzui': 'kimetsu-no-yaiba/images/0/07/Tengen_anime.png',
  'Gyomei Himejima': 'kimetsu-no-yaiba/images/8/85/Gyomei_anime.png',

  // --- My Hero Academia ---
  'Izuku Midoriya (Deku)': 'bokunoheroacademia/images/2/2b/Izuku_Midoriya_Costume_Databook.png',
  'All Might': 'bokunoheroacademia/images/c/cd/Toshinori_Yagi_Golden_Age_Hero_Costume_%28Anime%29.png',
  'Katsuki Bakugo': 'bokunoheroacademia/images/b/b3/Katsuki_Bakugo_Winter_Costume_2_%28Anime%29.png',
  Endeavor: 'bokunoheroacademia/images/d/d4/Enji_Todoroki_S7_Visual.png',
  'Shoto Todoroki': 'bokunoheroacademia/images/d/d8/Shoto_Todoroki_Action_5.png',
  Dabi: 'bokunoheroacademia/images/d/d9/Post-War_Dabi_Anime_Action.png',
  'All For One': 'bokunoheroacademia/images/a/ae/Post-War_All_For_One_Action.png',
  'Tomura Shigaraki': 'bokunoheroacademia/images/2/25/Final_War_Tomura_Shigaraki.png',
  'Shota Aizawa': 'bokunoheroacademia/images/d/dc/Eraser_Head_Profile_2_%2810th_Anniversary%29.png',
  'Present Mic': 'bokunoheroacademia/images/6/64/Hizashi_Yamada_Hero_Costume_%28Anime%29.png',
  'Tenya Iida': 'bokunoheroacademia/images/b/b8/Tenya_Ida_Action_5.png',
  'Tensei Iida (Ingenium)':
    'bokunoheroacademia/images/e/e6/Tensei_Ida_Hero_Costume_%28Vigilantes_Anime%29.png',
  Hawks: 'bokunoheroacademia/images/6/6b/Post-War_Keigo_Takami_Hero_Costume_%28Anime%29.png',
  'Fumikage Tokoyami': 'bokunoheroacademia/images/3/39/Fumikage_Tokoyami_Action_4.png',
  'Mirio Togata (Lemillion)': 'bokunoheroacademia/images/2/2e/Mirio_Togata_Action_2.png',
  'Tamaki Amajiki (Suneater)': 'bokunoheroacademia/images/7/76/Tamaki_Amajiki_Action_2.png',

  // --- Dragon Ball ---
  'Son Goku': 'dragonball/images/b/ba/Goku_anime_profile.png',
  Bardock:
    'dragonball/images/d/d5/Bardock_-_The_Father_of_Goku_-_Bardock_after_landing_on_Planet_Meat.png',
  'Son Gohan': 'dragonball/images/3/3b/Gohan_anime_profile_3.png',
  'Son Goten': 'dragonball/images/c/c9/Super_Hero_-_Goten_artwork.jpg',
  Piccolo: 'dragonball/images/b/b7/Super_Hero_-_Piccolo_artwork_3.png',
  'Piccolo Daimao': 'dragonball/images/3/3b/King_Piccolo_Episode_112.png',
  Freezer: 'dragonball/images/e/ee/DBS_Broly_Frieza_Render.png',
  Cooler: 'dragonball/images/4/4e/Cooler%27s_Revenge_-_Cooler_prepares_to_transform.png',
  'C-17 (Android 17)': 'dragonball/images/2/27/Android_17_%28DBZ_ep.148%29.jpg',
  'C-18 (Android 18)': 'dragonball/images/e/e6/Android_18_anime_profile.png',
  Krillin: 'dragonball/images/5/54/Krillin_DB_Episode_134.png',
  Tenshinhan: 'dragonball/images/5/56/Tien_DBZ_Kai.png',
  Beerus: 'dragonball/images/7/7d/BeerusWikia_%283%29.jpg',
  Champa: 'dragonball/images/f/fc/13001281_1570422286602499_8941391900815166996_n.jpg',
  Broly: 'dragonball/images/c/cd/Broly_Infobox_image.png',
  Kale: 'dragonball/images/d/df/Kale_01.png',

  // --- Death Note ---
  'Light Yagami': 'deathnote/images/0/05/299276.jpg',
  'L Lawliet': 'deathnote/images/7/76/299276L.jpg',
  Near: 'deathnote/images/a/a9/Manga_character_icon_Near.jpg',
  Mello: 'deathnote/images/9/98/Mello.gif',
  'Misa Amane': 'deathnote/images/6/60/295978.jpg',
  'Kiyomi Takada': 'deathnote/images/4/4d/Takada_elected.jpg',
  Ryuk: 'deathnote/images/a/a8/Ryuk_DN_Coloured.png',
  Rem: 'deathnote/images/2/2a/Remart.jpg',
  'Soichiro Yagami': 'deathnote/images/e/eb/Soichiro_Yagami.PNG',
  'Touta Matsuda': 'deathnote/images/5/5a/Manga_matsuda.jpg',
  'Teru Mikami': 'deathnote/images/6/6e/Mikami_%28blanc_et_noir%29.JPG',
  'Kyosuke Higuchi': 'deathnote/images/a/a9/Higuchicolour.jpeg',
  'Shuichi Aizawa': 'deathnote/images/3/34/Aizawa_acting_on_his_own.jpg',
  'Kanzo Mogi': 'deathnote/images/d/d9/MogiCH101.jpeg',
  'Naomi Misora': 'deathnote/images/2/26/DN_021.jpg',
  'Raye Penber': 'deathnote/images/3/37/RayePenberArtbook.jpg',

  // --- Harry Potter ---
  'Harry Potter': 'harrypotter/images/c/ce/Harry_Potter_DHF1.jpg',
  'Neville Longbottom': 'harrypotter/images/b/ba/Neville_Longbottom_DHF2_promo_2.jpg',
  'Sirius Black': 'harrypotter/images/b/bc/OOTP_promo_front_closeup_Sirius_Black.jpg',
  'Regulus Black': 'harrypotter/images/7/73/Regulus_PM.png',
  'Severus Snape': 'harrypotter/images/a/a3/Severus_Snape.jpg',
  'Horace Slughorn': 'harrypotter/images/a/a1/Horace_Slughorn_%28HBP_promo%29_1-1.jpg',
  'Bellatrix Lestrange': 'harrypotter/images/1/14/BellatrixLestrange.png',
  'Barty Crouch Jr.': 'harrypotter/images/f/f4/Barty_Crouch_Junior.jpg',
  'Albus Dumbledore': 'harrypotter/images/7/75/Albus_Dumbledore_%28HBPF_promo%29.jpg',
  'Gellert Grindelwald': 'harrypotter/images/4/40/Gellert_Grindelwald_SODM.jpeg',
  'Fred Weasley': 'harrypotter/images/9/9e/Fred_Weasley_promo_DHF1.jpg',
  'George Weasley': 'harrypotter/images/b/b5/George_Weasley_promo_DHF1.jpg',
  'Remus Lupin': 'harrypotter/images/e/e2/Remus_Lupin_Deathly_Hallows_promo_image.jpg',
  'Fenrir Greyback': 'harrypotter/images/b/b2/Fenrir_Greyback.png',
  'Lucius Malfoy': 'harrypotter/images/b/b4/Lucius_Malfoy_BoH.png',
  'Draco Malfoy': 'harrypotter/images/7/7e/Draco_Malfoy_TDH.png',

  // --- Marvel / MCU ---
  Thor: 'marvelcinematicuniverse/images/2/2b/Thor_Infobox.jpg',
  Loki: 'marvelcinematicuniverse/images/b/b5/Loki_Infobox.png',
  'Tony Stark': 'marvelcinematicuniverse/images/9/9d/Iron_Man_Infobox.jpg',
  'Obadiah Stane': 'marvelcinematicuniverse/images/a/ad/Obadiah_Stane.png',
  'Steve Rogers': 'marvelcinematicuniverse/images/b/b7/Steve_Rogers_Infobox.jpg',
  'Bucky Barnes': 'marvelcinematicuniverse/images/2/21/Winter_Soldier_Infobox.jpg',
  Vision: 'marvelcinematicuniverse/images/6/6e/Vision_Infobox.jpg',
  Ultron: 'marvelcinematicuniverse/images/6/6a/Ultron_Infobox.jpg',
  'Doctor Strange': 'marvelcinematicuniverse/images/b/b2/Doctor_Strange_MoM_Profile.jpeg',
  'Karl Mordo': 'marvelcinematicuniverse/images/9/98/Karl_Mordo.png',
  'Clint Barton (Hawkeye)': 'marvelcinematicuniverse/images/5/5b/Hawkeye_Infobox.jpg',
  'Natasha Romanoff (Black Widow)':
    'marvelcinematicuniverse/images/3/3f/Black_Widow_Infobox.jpg',
  "T'Challa": 'marvelcinematicuniverse/images/9/9d/T%27Challa_Infobox.jpg',
  'Erik Killmonger':
    'marvelcinematicuniverse/images/9/9d/Black_Panther_Textless_Character_Poster_03.jpg',
  'Wanda Maximoff': 'marvelcinematicuniverse/images/6/60/Scarlet_Witch_Infobox.jpg',
  'Agatha Harkness': 'marvelcinematicuniverse/images/a/a5/Agatha_Harkness_Infobox.jpg',
};

/** Full CDN URL for a character, or undefined when we have no picture. */
export function imageFor(name: string): string | undefined {
  const path = PATHS[name];
  if (!path) return undefined;
  return `${CDN}${path}/revision/latest/scale-to-width-down/${WIDTH}`;
}

export const IMAGE_COUNT = Object.keys(PATHS).length;
export const ALL_IMAGE_URLS = Object.keys(PATHS).map((n) => imageFor(n)!);
