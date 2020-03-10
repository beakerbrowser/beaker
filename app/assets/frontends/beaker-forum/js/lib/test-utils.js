import { ensureUnmountByUrl } from './fs.js'
import { slugify } from './strings.js'
import * as uwg from './uwg.js'

var debugDrives = createPersistedArray('debug-drives')

export function init () {
}

export function listDrives () {
  return Array.from(debugDrives)
}

export async function generateDrives (num = 10) {
  if (!confirm('This will generate a lot of test drives. Continue?')) {
    return
  }

  for (let i = 0; i < num; i++) {
    let profile = FAKE_PROFILES[(i + debugDrives.length) % FAKE_PROFILES.length]
    let drive = hyperdrive.create(Object.assign(profile, {type: 'user', prompt: false}))
    debugDrives.push(drive.url)
    await uwg.users.add(drive.url, slugify(profile.title))
  }
}

export async function generatePosts (numPosts = 10) {
  var driveUrls = Array.from(debugDrives)
  var fake_post_words = FAKE_POST.split(' ')
  for (let i = 0; i < numPosts; i++) {
    for (let driveUrl of driveUrls) {
      let drive = hyperdrive.load(driveUrl)
      let numWords = Math.min(Math.floor(Math.random() * fake_post_words.length), 30) + 1
      let startWord = Math.floor(Math.random() * numWords)
      let title = fake_post_words.slice(startWord, numWords).join(' ')
      await uwg.posts.addLink({
        href: 'https://beakerbrowser.com',
        title
      }, drive)
    }
  }
}

export async function generateComments (numComments = 10) {
  var driveUrls = Array.from(debugDrives)
  var fake_post_words = FAKE_POST.split(' ')
  for (let i = 0; i < numComments; i++) {
    for (let driveUrl of driveUrls) {
      let drive = hyperdrive.load(driveUrl)
      let numWords = Math.min(Math.floor(Math.random() * fake_post_words.length)) + 1
      let startWord = Math.floor(Math.random() * numWords)
      let content = fake_post_words.slice(startWord, numWords).join(' ')
      let post = await getRandomPost()
      let parentComment = (Math.random() > 0.5) ? await getRandomCommentOnPost(post) : undefined
      await uwg.comments.add({
        href: post.url,
        parent: parentComment ? parentComment.url : undefined,
        content
      }, drive)
    }
  }
}

export async function deleteDrives () {
  if (!confirm('Delete all test drives?')) {
    return
  }

  for (let url of debugDrives) {
    console.debug('Unlinking', url)
    await uwg.users.removeByKey(url)
  }
  debugDrives.length = 0
}

// internal
// =

async function getRandomPost () {
  var posts = await uwg.posts.list({limit: 50}, {includeProfiles: true})
  return posts[Math.floor(Math.random() * posts.length)]
}

async function getRandomCommentOnPost (post) {
  var comments = await uwg.comments.list({limit: 50, href: post.url}, {includeContent: false})
  return comments[Math.floor(Math.random() * comments.length)]
}

async function getRandomPostOrComment () {
  var [posts, comments] = await Promise.all([
    uwg.posts.list({}, {includeContent: false}),
    uwg.comments.list({}, {includeContent: false})
  ])
  var candidates = posts.concat(comments)
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function getRandomOtherThan (values, valueNotToTake) {
  let v = undefined
  while (!v || v === valueNotToTake) {
    v = values[Math.floor(values.length * Math.random())]
  }
  return v
}

/**
 * @param {string} id 
 * @returns {Array}
 */
function createPersistedArray (id) {
  function read () { try { return JSON.parse(localStorage[id]) } catch (e) { return [] } }
  function write (values) { localStorage[id] = JSON.stringify(values) }
  return /** @type Array */(new Proxy({}, {
    get (obj, k) { return read()[k] },
    set (obj, k, v) { var values = read(); values[k] = v; write(values); return true },
    deleteProperty (obj, k) { var values = read(); delete values[k]; write(values); return true }
  }))
}

const FAKE_POST = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."

const FAKE_PROFILES = [
  {
    "title": "Deirdre Richardson",
    "description": "In fugiat reprehenderit voluptate magna ipsum quis ullamco. Officia aute in ad exercitation adipisicing. Sit incididunt Lorem quis sunt aliquip reprehenderit sint magna proident tempor nisi fugiat. Minim elit magna commodo adipisicing fugiat minim aliquip adipisicing cupidatat amet sint ut deserunt duis. Ea cillum enim reprehenderit est labore aliqua minim.\r\n"
  },
  {
    "title": "Swanson Perry",
    "description": "Dolore culpa cillum adipisicing do. Est non magna culpa do qui reprehenderit. Reprehenderit sunt ad nulla ullamco. Cillum cupidatat velit sit officia nostrud elit nisi veniam ut deserunt ad. Ullamco et deserunt velit Lorem laboris. Esse et eu commodo excepteur labore duis tempor ad ea labore exercitation.\r\n"
  },
  {
    "title": "Yesenia Anthony",
    "description": "Nostrud voluptate laborum occaecat minim ea dolore id qui officia ullamco magna. Aliqua quis excepteur minim eiusmod deserunt incididunt sit deserunt dolor minim. Esse veniam reprehenderit labore enim magna ad Lorem proident et esse ullamco et.\r\n"
  },
  {
    "title": "Jamie Glenn",
    "description": "Ea est culpa anim esse ullamco sint velit do ipsum nostrud aute. Exercitation voluptate id elit sunt. Excepteur anim officia aute do ex voluptate occaecat ullamco consequat labore ad nulla. Id do exercitation eu ipsum adipisicing esse cillum duis sunt culpa ipsum. Consectetur et laborum in culpa laboris ea. Occaecat minim id dolor id.\r\n"
  },
  {
    "title": "Blackwell Ryan",
    "description": "Laboris ut aute qui consequat in excepteur amet ullamco proident enim. Id aliqua eu adipisicing aliquip pariatur. Adipisicing irure voluptate aute magna consequat do labore esse minim commodo exercitation amet. Et commodo do elit est deserunt sit elit ipsum velit laboris dolor id laborum esse. Ut cillum occaecat id cupidatat esse fugiat nostrud enim. Pariatur non enim non qui sunt et excepteur enim ad cillum. Sunt laboris exercitation cupidatat excepteur dolor nisi.\r\n"
  },
  {
    "title": "Kris Grimes",
    "description": "Magna proident aliquip non cupidatat tempor adipisicing Lorem. Pariatur eiusmod cupidatat elit et nulla amet tempor voluptate. In culpa nisi amet amet duis mollit adipisicing consequat magna officia consequat labore anim.\r\n"
  },
  {
    "title": "Gena Manning",
    "description": "Commodo tempor nulla laborum consectetur ullamco. Quis quis consectetur amet do ex pariatur anim aliqua deserunt. Et dolor sint anim velit non labore dolore consequat officia ad nisi pariatur. Ut duis est enim nisi aliqua eiusmod do enim. Id minim adipisicing excepteur velit et cupidatat voluptate aliquip. Amet minim sunt culpa qui minim incididunt dolor velit ullamco sit anim enim mollit quis.\r\n"
  },
  {
    "title": "Whitehead Barker",
    "description": "Ut magna tempor ullamco excepteur laborum commodo voluptate laborum commodo deserunt dolore consequat mollit. Est veniam proident adipisicing nisi laborum excepteur nulla id ea. Sit sint pariatur in id in aliqua eiusmod non labore qui aute incididunt. Do et culpa aliqua quis tempor amet. Est consectetur aliqua aliqua velit labore ullamco eu. Exercitation nulla est elit elit sint nulla occaecat dolor. Sit id exercitation ut id.\r\n"
  },
  {
    "title": "Marina Hyde",
    "description": "Deserunt velit aute ipsum qui mollit cillum deserunt eiusmod elit commodo. Duis veniam exercitation irure id laborum. Adipisicing Lorem id Lorem consectetur commodo consequat sunt mollit eiusmod ut exercitation ut labore. Lorem reprehenderit eiusmod commodo ad sit est consectetur consequat exercitation nisi id adipisicing. Aliqua incididunt nostrud excepteur tempor tempor pariatur in esse amet. Consequat est voluptate cillum non aute qui ea ad Lorem.\r\n"
  },
  {
    "title": "Cabrera Joyce",
    "description": "Lorem nulla commodo aliqua ullamco. Fugiat incididunt laboris minim consectetur laborum sunt adipisicing magna. Culpa ex non ex tempor qui enim id ea dolor reprehenderit nulla ullamco. Exercitation incididunt magna ad dolore consequat anim. Eiusmod nulla ullamco cillum exercitation velit mollit veniam cupidatat ut eu reprehenderit id. Sunt laborum pariatur ut cillum anim proident eiusmod reprehenderit proident veniam duis veniam labore. Labore veniam fugiat aliqua cupidatat cupidatat anim anim exercitation minim in nostrud.\r\n"
  },
  {
    "title": "Inez Bryant",
    "description": "Sit adipisicing aute aliquip officia amet amet qui anim enim laboris ex tempor sint. Tempor incididunt consectetur id non laborum. Eiusmod consequat labore quis sint non eu ad sint culpa ut. Consectetur in enim laborum officia veniam cillum anim excepteur ullamco esse eu culpa fugiat et. Amet aliqua laboris eu dolor non et excepteur do laboris est. In ut labore eu anim dolore officia nisi cupidatat ea irure aliqua. Sunt exercitation officia officia pariatur sint nisi culpa consectetur do Lorem officia nisi fugiat ut.\r\n"
  },
  {
    "title": "Dianne Trevino",
    "description": "Non sint magna nisi occaecat Lorem incididunt cupidatat occaecat ut. Dolore aliqua non exercitation culpa magna Lorem. Occaecat qui anim non do dolore est cillum et enim et dolore voluptate cillum cillum. Minim sit occaecat in irure minim velit enim voluptate est pariatur ad voluptate. Ad reprehenderit laborum non dolor irure eu cupidatat ex proident excepteur minim velit voluptate. Nisi nostrud amet anim cupidatat id. Ipsum dolor aliquip adipisicing veniam qui dolore qui laboris duis dolore cupidatat dolor.\r\n"
  },
  {
    "title": "Mavis Frost",
    "description": "Non laborum Lorem cillum quis enim. Velit irure voluptate deserunt et sit anim qui. Ad est fugiat enim incididunt aliqua dolore qui. Elit cupidatat magna ullamco do Lorem cupidatat esse id ipsum labore id mollit irure. Mollit fugiat id dolor laborum. Mollit esse amet occaecat sit ipsum elit mollit eiusmod deserunt deserunt. Non labore nisi dolore incididunt laboris occaecat.\r\n"
  },
  {
    "title": "Lawson Hunt",
    "description": "Mollit Lorem occaecat ullamco eiusmod amet dolor fugiat. Commodo duis laboris laboris duis nisi pariatur. Adipisicing deserunt mollit velit ut nostrud voluptate nulla incididunt elit veniam deserunt. Non do minim excepteur culpa.\r\n"
  },
  {
    "title": "Hester Kirkland",
    "description": "Enim aliqua ex nisi aute eiusmod ullamco dolor. Non id culpa consectetur elit in Lorem amet quis veniam in aliquip est nisi. Elit velit commodo occaecat cillum. Sit in ut fugiat amet tempor sit adipisicing commodo et id aliquip incididunt. Irure eiusmod proident duis duis officia tempor ipsum voluptate labore do est ad.\r\n"
  },
  {
    "title": "Riddle Whitney",
    "description": "Ipsum eiusmod fugiat minim nisi sint eiusmod mollit laborum nulla duis nisi aute do. Deserunt dolor ea sunt officia adipisicing irure enim aliquip magna ut veniam. Reprehenderit tempor amet ullamco aliqua proident mollit officia.\r\n"
  },
  {
    "title": "Ericka Hammond",
    "description": "Aliqua dolor culpa esse proident fugiat mollit labore nisi veniam fugiat id. Adipisicing sint nisi deserunt enim proident eu nostrud. Incididunt est incididunt irure non ex magna esse aliqua commodo voluptate enim incididunt fugiat. Laboris ipsum cupidatat ad sunt occaecat.\r\n"
  },
  {
    "title": "Becker Lowe",
    "description": "Excepteur amet incididunt exercitation deserunt pariatur est quis irure. Consequat in occaecat enim labore mollit. Pariatur culpa amet Lorem labore laborum amet.\r\n"
  },
  {
    "title": "Kaufman Houston",
    "description": "Ut laboris eu minim fugiat laborum cillum eiusmod. Sunt labore Lorem ex ut excepteur aliqua aliqua fugiat quis consequat dolore ea Lorem. Tempor mollit occaecat officia non est ipsum nisi mollit veniam aliqua quis.\r\n"
  },
  {
    "title": "Chris Wallace",
    "description": "Mollit elit qui consequat amet. Ad consequat minim veniam proident ut sint. Excepteur occaecat ex consectetur adipisicing amet. Ullamco cupidatat est dolore dolore ex mollit labore est. Labore mollit esse magna reprehenderit in reprehenderit veniam cupidatat nulla culpa ipsum dolore. Ex aliquip excepteur incididunt quis cupidatat aute esse.\r\n"
  },
  {
    "title": "Elinor Barnes",
    "description": "Exercitation incididunt ex deserunt est exercitation. Minim veniam non officia reprehenderit mollit quis consequat consectetur officia amet irure sunt eiusmod fugiat. Adipisicing consequat irure culpa id Lorem.\r\n"
  },
  {
    "title": "Barker Moreno",
    "description": "Deserunt proident mollit commodo exercitation officia nulla Lorem. Amet deserunt sit in velit magna adipisicing Lorem sunt cupidatat commodo ullamco. Velit consectetur ex velit reprehenderit labore. Consectetur proident ea aliqua officia cupidatat commodo minim culpa cupidatat voluptate pariatur excepteur. Dolor et et et sunt sit ut excepteur anim do sint ipsum. Pariatur deserunt aute tempor eu esse.\r\n"
  },
  {
    "title": "Silvia Carney",
    "description": "Mollit aliqua amet non ex eu qui tempor mollit consectetur tempor nisi occaecat aliquip. Reprehenderit voluptate et est enim est nostrud nisi dolore do nisi excepteur. Sint id dolor irure irure duis dolor est duis. Minim nostrud aliqua laboris sunt excepteur occaecat magna occaecat anim pariatur mollit do. Dolore esse nulla est irure ea pariatur nostrud fugiat non dolore amet exercitation dolor. Excepteur mollit deserunt ea quis proident nulla.\r\n"
  },
  {
    "title": "Gray Gomez",
    "description": "Labore eiusmod nostrud ad officia ex ad dolore. Occaecat sit ex ex incididunt ea ullamco qui minim veniam. Ipsum irure velit adipisicing ad.\r\n"
  },
  {
    "title": "Cara Vasquez",
    "description": "Commodo aliquip minim dolor aliqua aliquip tempor irure. Nulla amet eu minim mollit deserunt magna magna id. Duis pariatur mollit irure consequat eu. Excepteur anim sint veniam non et laboris id proident ex laborum irure.\r\n"
  },
  {
    "title": "Myrtle Chang",
    "description": "Non ea et sunt id proident ipsum. Proident aute dolore fugiat ullamco deserunt quis dolore dolor voluptate aliqua pariatur mollit tempor eu. Nisi sint adipisicing deserunt cillum adipisicing non consequat est irure voluptate in. Minim id dolor incididunt duis excepteur cillum laborum enim aliquip eiusmod qui et minim consectetur. Exercitation ullamco nisi eiusmod non aliqua. Velit est in eiusmod sunt sit. Ut quis sit amet ullamco proident aute nisi occaecat enim.\r\n"
  },
  {
    "title": "Lakeisha Hooper",
    "description": "Cillum nostrud laboris eiusmod ea aliqua est nostrud excepteur aliquip pariatur adipisicing occaecat. Cillum in mollit id culpa nostrud ex enim commodo qui et ex nostrud laboris aliquip. Exercitation do nulla voluptate sit officia dolore. Id pariatur esse duis commodo adipisicing Lorem. Sunt eiusmod minim consequat do cupidatat esse do cupidatat eu. Minim enim sunt nulla culpa. Incididunt eu tempor do commodo aliqua enim sint voluptate proident dolor.\r\n"
  },
  {
    "title": "Ross Graham",
    "description": "Minim eu amet dolore proident dolore dolore elit enim sint incididunt sit anim voluptate anim. Et amet eiusmod voluptate eiusmod. Ipsum labore duis velit qui consequat nulla cupidatat officia duis. Culpa eiusmod proident ex voluptate.\r\n"
  },
  {
    "title": "Shepherd Miller",
    "description": "Ipsum minim magna ullamco dolore duis cupidatat non nulla. Ullamco nulla consequat amet nisi esse minim velit exercitation. Mollit reprehenderit elit officia laboris amet aliqua sunt laborum sunt fugiat sit do. Exercitation sunt amet laborum mollit ea. Deserunt sint incididunt officia sunt.\r\n"
  },
  {
    "title": "England Wilkinson",
    "description": "Pariatur incididunt aliquip ex veniam eu duis ad elit pariatur pariatur ipsum amet officia eiusmod. Ea tempor Lorem aliqua cillum aliqua quis. Veniam aliquip pariatur pariatur exercitation cupidatat aute aliquip reprehenderit in ex aute occaecat labore minim. Irure velit tempor ullamco exercitation est officia do non veniam laboris labore et irure.\r\n"
  },
  {
    "title": "Nadia Schultz",
    "description": "Consequat ut nisi excepteur consequat sunt officia mollit. Labore in magna eiusmod nulla nulla. Cupidatat nostrud laborum voluptate ut occaecat occaecat nostrud sit. Irure nostrud dolor excepteur id nisi nulla eiusmod excepteur dolor consequat do qui.\r\n"
  },
  {
    "title": "Courtney Neal",
    "description": "Anim cillum in do occaecat incididunt deserunt eu qui dolore cillum amet. Reprehenderit amet culpa officia amet. Tempor eiusmod nisi amet Lorem esse consectetur non laboris labore deserunt commodo cupidatat magna ullamco. Tempor magna elit enim eu ut velit officia adipisicing nostrud amet tempor. In ad excepteur veniam consectetur ipsum ex dolore.\r\n"
  },
  {
    "title": "Julie Robles",
    "description": "Elit officia ea ut eiusmod deserunt mollit adipisicing mollit. Ea nisi qui ullamco ea veniam laborum fugiat eu voluptate non adipisicing dolore ut. Pariatur adipisicing id fugiat esse velit cupidatat laborum exercitation fugiat sint pariatur proident.\r\n"
  },
  {
    "title": "Darlene Little",
    "description": "Sint fugiat commodo nostrud veniam sit ex cillum. Commodo est veniam reprehenderit nostrud pariatur quis sint pariatur. Laboris nisi proident cupidatat amet laboris quis. Est irure occaecat eu esse aute.\r\n"
  },
  {
    "title": "Ella Campos",
    "description": "Culpa Lorem incididunt dolor sunt commodo magna. Incididunt ipsum anim nisi ex consectetur. Fugiat aliquip est pariatur elit ipsum sit nisi nostrud est ea adipisicing. Est ipsum culpa aliquip est ullamco anim. Sunt sint cillum dolore quis aliqua occaecat. Anim commodo nulla ipsum velit consectetur amet mollit sit. Cillum ex et cupidatat voluptate tempor voluptate mollit sunt.\r\n"
  },
  {
    "title": "Rose Gilmore",
    "description": "Fugiat ullamco dolore nostrud qui exercitation nisi ipsum est. In id aliqua veniam reprehenderit nostrud culpa dolore proident ullamco ex. Et elit cillum dolore proident reprehenderit fugiat pariatur minim. Reprehenderit mollit minim quis incididunt et. Dolore in sit reprehenderit irure cupidatat tempor nulla irure. Laboris reprehenderit quis aliqua excepteur.\r\n"
  },
  {
    "title": "Lesa Valencia",
    "description": "Mollit qui excepteur tempor esse aliqua enim consequat officia cillum commodo nisi duis. Id sint excepteur fugiat in consectetur. Deserunt quis nulla consequat ea ipsum occaecat nulla.\r\n"
  },
  {
    "title": "Bright Spears",
    "description": "Lorem velit irure eu quis in Lorem aliqua culpa. Enim Lorem non occaecat dolor. Ut nostrud ullamco pariatur sunt fugiat tempor exercitation incididunt occaecat voluptate. Exercitation esse ipsum voluptate aute Lorem. Tempor et laboris laboris magna cillum aliqua dolor eiusmod. Laborum excepteur adipisicing dolore proident aliquip tempor aute duis. Ex fugiat culpa laboris minim culpa culpa ullamco labore ullamco.\r\n"
  },
  {
    "title": "Lorie Short",
    "description": "Quis dolore aliqua aute enim aliquip laboris pariatur commodo dolore dolore. Commodo reprehenderit sint magna eu laborum magna fugiat laboris minim mollit. Anim ipsum ut deserunt incididunt cupidatat sunt fugiat mollit eiusmod. Excepteur consectetur adipisicing enim ex adipisicing aliqua dolore velit tempor sint dolor laborum commodo reprehenderit. Proident fugiat nisi nisi sint officia elit. Pariatur mollit reprehenderit aliquip ad officia. Et do laborum proident eiusmod aliquip tempor pariatur sint velit pariatur ipsum et.\r\n"
  },
  {
    "title": "Wilkins Hardy",
    "description": "Nisi nulla fugiat pariatur officia eu veniam quis sit commodo eiusmod. Fugiat irure sint labore consequat incididunt adipisicing commodo fugiat sunt nisi. Et consequat deserunt labore proident qui ad quis officia est. Nostrud anim elit culpa nulla enim. Nulla Lorem pariatur proident aliquip veniam qui occaecat.\r\n"
  },
  {
    "title": "Davis Mueller",
    "description": "Minim labore Lorem culpa cupidatat ullamco in laborum pariatur. Enim aliqua laborum occaecat enim. Eiusmod fugiat in voluptate non Lorem id reprehenderit amet consectetur pariatur qui. Id laboris eiusmod ex adipisicing ut eiusmod aliqua. Ex ut dolore elit labore deserunt enim in consequat. Duis nostrud incididunt excepteur dolore minim minim in velit officia adipisicing et do duis labore. Qui laboris minim deserunt esse ea aliqua.\r\n"
  },
  {
    "title": "Nola Kramer",
    "description": "Consequat velit non ex laborum sunt consequat officia elit nulla irure fugiat ut Lorem. Nostrud reprehenderit ex cillum ut non culpa voluptate. Et nostrud duis consectetur voluptate enim. Dolor non eu ut voluptate esse quis minim incididunt tempor ullamco magna labore sint do. Et ea pariatur adipisicing sint. Elit commodo labore veniam irure.\r\n"
  },
  {
    "title": "Roy Sellers",
    "description": "Lorem consectetur laboris aliqua reprehenderit commodo et Lorem laborum dolor aliquip pariatur. Mollit occaecat enim officia proident reprehenderit nulla aliquip aliqua ipsum. Duis fugiat et aute occaecat ea aliquip velit dolor. Mollit sunt occaecat aliqua adipisicing enim dolor veniam ex eu fugiat amet et dolore.\r\n"
  },
  {
    "title": "Beverley Miranda",
    "description": "Quis consectetur ea id dolor Lorem ea ad ipsum incididunt officia amet. Excepteur fugiat pariatur reprehenderit ut. Labore exercitation nulla dolor tempor tempor. Eu id excepteur veniam aute. Do nulla commodo labore minim elit dolore minim eiusmod pariatur nulla cupidatat et laborum labore.\r\n"
  },
  {
    "title": "Dawn Bates",
    "description": "Irure laboris pariatur culpa esse exercitation. Aliquip tempor nulla laboris duis consectetur ipsum exercitation excepteur cupidatat. Id ullamco consequat adipisicing officia eiusmod adipisicing fugiat in dolore aliqua aliquip. Ut officia proident consequat ea mollit reprehenderit culpa elit minim.\r\n"
  },
  {
    "title": "Hannah Lang",
    "description": "Ex magna tempor in tempor id. Fugiat ut ipsum do ad nostrud officia cupidatat aliquip deserunt dolor. Pariatur veniam excepteur reprehenderit proident velit fugiat ipsum. Nulla irure minim nostrud quis. Do duis est nostrud duis amet anim tempor voluptate sit anim anim anim ea.\r\n"
  },
  {
    "title": "Cortez Slater",
    "description": "Ad anim ullamco ipsum ex adipisicing. Commodo in exercitation veniam est. Ipsum excepteur qui aute ex. Minim ea dolor et labore do non laboris sit ullamco.\r\n"
  },
  {
    "title": "Bradshaw Jordan",
    "description": "Pariatur pariatur ut occaecat fugiat minim magna est commodo cillum esse. Nostrud nulla et magna excepteur sit do irure cillum amet adipisicing non culpa id esse. Velit tempor exercitation nostrud occaecat aliquip reprehenderit aliquip culpa laborum ut veniam id voluptate. Adipisicing duis mollit ipsum aliqua est. Aute esse officia fugiat veniam quis nostrud et veniam laboris. Enim magna Lorem fugiat magna amet qui dolor eu magna occaecat. Officia tempor irure irure consequat enim cupidatat proident proident dolore ipsum ut reprehenderit cillum.\r\n"
  },
  {
    "title": "Waller Mathews",
    "description": "Labore eiusmod proident exercitation Lorem officia officia adipisicing. Incididunt occaecat sint eiusmod nisi qui tempor ullamco duis adipisicing Lorem eu Lorem minim voluptate. Duis aliquip irure laborum nulla laborum aute ipsum ut occaecat eu. Exercitation sunt do do sint dolor cillum fugiat et mollit pariatur veniam.\r\n"
  },
  {
    "title": "Taylor Griffith",
    "description": "Laborum culpa sint elit sit aliquip qui est deserunt. Esse sint tempor mollit amet labore in nostrud aliquip ex minim anim. Ullamco et enim officia dolor dolor qui in minim nostrud. Incididunt sint eu sit eu. Exercitation eiusmod aliquip nulla aute minim exercitation id.\r\n"
  },
  {
    "title": "Elba Stevens",
    "description": "Esse ad veniam voluptate consequat. Enim adipisicing ea cupidatat in minim nulla anim cillum laboris ad ea. Dolore pariatur sint proident velit officia reprehenderit ipsum reprehenderit id deserunt elit fugiat anim ea. Occaecat ex pariatur officia veniam elit fugiat id aliqua qui.\r\n"
  }
]