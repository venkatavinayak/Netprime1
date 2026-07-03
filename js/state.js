/* js/state.js */

// Global namespace to ensure full file:// protocol compatibility without ES Modules
(function() {
  const STORAGE_KEY_USER = 'netprime_current_user';
  const STORAGE_KEY_WISHLIST = 'netprime_wishlist';

  // Complete, Rich Local Movie Database
  const moviesDatabase = [
    // Top Trending / General
    {
      id: 'salaar',
      title: 'Salaar: Ceasefire',
      category: 'telugu',
      language: 'Telugu',
      rating: '8.9',
      duration: '2h 55m',
      year: '2023',
      desc: 'A gang leader makes a promise to a dying friend and takes on other criminal gangs in a high-octane action thriller.',
      poster: './assets/pngsala.png',
      video: './assets/salatri.mp4',
      isFree: false,
      cast: 'Prabhas, Prithviraj Sukumaran, Shruti Haasan'
    },
    {
      id: 'guntur',
      title: 'Guntur Kaaram',
      category: 'telugu',
      language: 'Telugu',
      rating: '8.1',
      duration: '2h 39m',
      year: '2024',
      desc: 'Years after his mother deserts him and remarries, Ramana is asked to sign a document declaring he has no ties with her.',
      poster: './assets/gnt .png',
      video: './assets/gunturtri.mp4',
      isFree: false,
      cast: 'Mahesh Babu, Sreeleela, Meenakshi Chaudhary'
    },
    {
      id: 'hanuman',
      title: 'Hanu-Man',
      category: 'telugu',
      language: 'Telugu',
      rating: '9.3',
      duration: '2h 38m',
      year: '2024',
      desc: 'An imaginary place called Anjanadri where the protagonist gets the powers of Hanuman and fights for his people.',
      poster: './assets/hi.png',
      video: './assets/hanuamntri.mp4',
      isFree: true,
      cast: 'Teja Sajja, Amritha Aiyer, Varalaxmi Sarathkumar'
    },
    {
      id: 'leo',
      title: 'Leo',
      category: 'tamil',
      language: 'Tamil',
      rating: '8.6',
      duration: '2h 44m',
      year: '2023',
      desc: 'A mild-mannered cafe owner becomes a local hero, but old ghosts return to haunt him and threaten his peaceful family life.',
      poster: './assets/vik.png',
      video: './assets/leotri.mp4',
      isFree: true,
      cast: 'Thalapathy Vijay, Sanjay Dutt, Trisha Krishnan'
    },
    {
      id: 'jailer',
      title: 'Jailer',
      category: 'tamil',
      language: 'Tamil',
      rating: '8.7',
      duration: '2h 48m',
      year: '2023',
      desc: 'A retired prison warden hunts down a notorious idol smuggling gang that he suspects killed his honest policeman son.',
      poster: './assets/sub.png',
      video: './assets/jailertri.mp4',
      isFree: false,
      cast: 'Rajinikanth, Vinayakan, Ramya Krishnan'
    },
    {
      id: 'dunki',
      title: 'Dunki',
      category: 'trending',
      language: 'Hindi',
      rating: '8.2',
      duration: '2h 42m',
      year: '2023',
      desc: 'Four friends from a village in Punjab share a common dream: to go to England. Their problem is that they have neither the visa nor the ticket.',
      poster: './assets/more.jpg', // fallback poster representation
      video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      isFree: false,
      cast: 'Shah Rukh Khan, Taapsee Pannu, Boman Irani'
    },
    {
      id: 'family',
      title: 'Family Star',
      category: 'telugu',
      language: 'Telugu',
      rating: '7.9',
      duration: '2h 30m',
      year: '2024',
      desc: 'The highs and lows of family life for a middle-class man who navigates love, duty, and financial struggles.',
      poster: './assets/family.png',
      video: './assets/jj.mp4',
      isFree: false,
      cast: 'Vijay Deverakonda, Mrunal Thakur'
    },
    {
      id: 'premalu',
      title: 'Premalu',
      category: 'malayalam',
      language: 'Malayalam',
      rating: '8.8',
      duration: '2h 36m',
      year: '2024',
      desc: 'Sachin pursues romance in Hyderabad, leading to hilarious situations and misadventures in this modern romantic comedy.',
      poster: './assets/saaa.png',
      video: './assets/tammu.mp4',
      isFree: false,
      cast: 'Naslen K. Gafoor, Mamitha Baiju, Shyam Mohan'
    },
    {
      id: 'miller',
      title: 'Captain Miller',
      category: 'tamil',
      language: 'Tamil',
      rating: '8.3',
      duration: '2h 37m',
      year: '2024',
      desc: 'A former British Army soldier tries to save his home village from destruction by the British forces in the pre-independence era.',
      poster: './assets/student.png', // using existing asset as fallback
      video: './assets/millertri.mp4',
      isFree: false,
      cast: 'Dhanush, Priyanka Arul Mohan, Shiva Rajkumar'
    },

    // Telugu Row Extensions
    {
      id: 'nayak',
      title: 'Bheemla Nayak',
      category: 'telugu',
      language: 'Telugu',
      rating: '8.0',
      duration: '2h 25m',
      year: '2022',
      desc: 'An ego clash ensues between an upright police officer and an influential ex-army havildar in a remote forest post.',
      poster: './assets/bhee.png',
      video: './assets/bheetri.mp4',
      isFree: true,
      cast: 'Pawan Kalyan, Rana Daggubati, Nithya Menen'
    },
    {
      id: 'hinanna',
      title: 'Hi Nanna',
      category: 'telugu',
      language: 'Telugu',
      rating: '9.0',
      duration: '2h 35m',
      year: '2023',
      desc: 'A single father photographer discovers new relationships and a deep emotional connection when his daughter meets a mysterious woman.',
      poster: './assets/tri.png', // fallback
      video: './assets/hitri.mp4',
      isFree: false,
      cast: 'Nani, Mrunal Thakur, Baby Kiara'
    },
    {
      id: 'bahubali',
      title: 'Bahubali 2: The Conclusion',
      category: 'telugu',
      language: 'Telugu',
      rating: '9.5',
      duration: '2h 47m',
      year: '2017',
      desc: 'Shiva, the son of Bahubali, learns about his heritage from Kattappa and begins to overthrow the tyrannical ruler Bhallaladeva.',
      poster: './assets/bahu.png',
      video: './assets/bahutri.mp4',
      isFree: false,
      cast: 'Prabhas, Rana Daggubati, Anushka Shetty'
    },
    {
      id: 'sitaramam',
      title: 'Sita Ramam',
      category: 'telugu',
      language: 'Telugu',
      rating: '9.2',
      duration: '2h 43m',
      year: '2022',
      desc: 'An orphaned soldier receives anonymous love letters from a girl named Sita, initiating a life-altering romance across conflict borders.',
      poster: './assets/ram.png',
      video: './assets/sitatri.mp4',
      isFree: false,
      cast: 'Dulquer Salmaan, Mrunal Thakur, Rashmika Mandanna'
    },

    // Tamil Row Extensions
    {
      id: 'vikram',
      title: 'Vikram',
      category: 'tamil',
      language: 'Tamil',
      rating: '9.1',
      duration: '2h 53m',
      year: '2022',
      desc: 'A special ops team hunts a mysterious masked vigilante group killing drug cartel kingpins, leading to an old agent\'s return.',
      poster: './assets/don.png', // using existing asset as fallback
      video: './assets/vikramtri.mp4',
      isFree: true,
      cast: 'Kamal Haasan, Vijay Sethupathi, Fahadh Faasil'
    },
    {
      id: 'don',
      title: 'Don',
      category: 'tamil',
      language: 'Tamil',
      rating: '7.8',
      duration: '2h 27m',
      year: '2022',
      desc: 'A high-spirited college student discovers his true calling in life while dealing with an extremely strict college discipline professor.',
      poster: './assets/brama.png', // fallback
      video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      isFree: false,
      cast: 'Sivakarthikeyan, S. J. Suryah, Priyanka Arul Mohan'
    },
    {
      id: 'varisu',
      title: 'Varisu',
      category: 'tamil',
      language: 'Tamil',
      rating: '7.6',
      duration: '2h 49m',
      year: '2023',
      desc: 'The prodigal youngest son of a business tycoon is forced to take over the reigns of his father\'s empire amid family rivalries.',
      poster: './assets/toli.png', // fallback
      video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      isFree: false,
      cast: 'Thalapathy Vijay, Rashmika Mandanna, Sarathkumar'
    },
    {
      id: 'kaithi',
      title: 'Kaithi',
      category: 'tamil',
      language: 'Tamil',
      rating: '8.9',
      duration: '2h 25m',
      year: '2019',
      desc: 'An ex-convict on his way to meet his daughter for the first time is recruited by a police officer to drive poisoned cops to the hospital.',
      poster: './assets/kushi.png', // fallback
      video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      isFree: false,
      cast: 'Karthi, Narain, Arjun Das'
    },

    // Kannada Row Extensions
    {
      id: 'kgf2',
      title: 'K.G.F: Chapter 2',
      category: 'kannada',
      language: 'Kannada',
      rating: '9.4',
      duration: '2h 48m',
      year: '2022',
      desc: 'In the blood-drenched Kolar Gold Fields, Rocky\'s name strikes fear into his foes, but his enemies gather to bring him down.',
      poster: './assets/set.png', // fallback
      video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      isFree: false,
      cast: 'Yash, Sanjay Dutt, Raveena Tandon'
    },
    {
      id: 'kantara',
      title: 'Kantara',
      category: 'kannada',
      language: 'Kannada',
      rating: '9.1',
      duration: '2h 30m',
      year: '2022',
      desc: 'A champion Kambala athlete clashes with a stubborn forest officer in a mythical village, where traditional spirit-worship reigns.',
      poster: './assets/sub.png', // fallback
      video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      isFree: false,
      cast: 'Rishab Shetty, Sapthami Gowda, Kishore'
    },
    {
      id: 'vkrona',
      title: 'Vikrant Rona',
      category: 'kannada',
      language: 'Kannada',
      rating: '7.8',
      duration: '2h 28m',
      year: '2022',
      desc: 'When a series of bizarre murders takes place in a tropical rainforest village, an eccentric police officer arrives to investigate.',
      poster: './assets/tri.png', // fallback
      video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      isFree: false,
      cast: 'Sudeep, Nirup Bhandari, Neetha Ashok'
    },

    // Malayalam Row Extensions
    {
      id: 'kurup',
      title: 'Kurup',
      category: 'malayalam',
      language: 'Malayalam',
      rating: '8.4',
      duration: '2h 36m',
      year: '2021',
      desc: 'Sukumara Kurup, a notorious fugitive who orchestrates a murder to claim insurance money, evades police for decades.',
      poster: './assets/student.png', // fallback
      video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      isFree: false,
      cast: 'Dulquer Salmaan, Indrajith Sukumaran, Sobhita Dhulipala'
    },
    {
      id: 'kaduva',
      title: 'Kaduva',
      category: 'malayalam',
      language: 'Malayalam',
      rating: '7.5',
      duration: '2h 30m',
      year: '2022',
      desc: 'A young rubber planter from Pala gets into a fierce rivalry with an influential top-ranking police officer.',
      poster: './assets/ram.png', // fallback
      video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutback.mp4',
      isFree: false,
      cast: 'Prithviraj Sukumaran, Vivek Oberoi, Samyuktha Menon'
    },

    // Classic Telugu Gated (Genuinely Gated Movies)
    {
      id: 'jalsa',
      title: 'Jalsa',
      category: 'classics',
      language: 'Telugu',
      rating: '8.8',
      duration: '2h 45m',
      year: '2008',
      desc: 'A young man becomes a Naxalite due to his tragic past. When he returns to normal society, he finds himself caught between love and revenge.',
      poster: './assets/jalsa.png',
      video: './assets/jalsa.mp4',
      isFree: true,
      cast: 'Pawan Kalyan, Ileana D\'Cruz, Parvati Melton'
    },
    {
      id: 'kushi',
      title: 'Kushi',
      category: 'classics',
      language: 'Telugu',
      rating: '8.7',
      duration: '2h 50m',
      year: '2001',
      desc: 'Siddhu and Madhu meet in college and fall in love, but their egos and minor misunderstandings keep them apart.',
      poster: './assets/kushi.png',
      video: './assets/kushi.mp4',
      isFree: false,
      cast: 'Pawan Kalyan, Bhumika Chawla'
    },
    {
      id: 'toli',
      title: 'Toli Prema',
      category: 'classics',
      language: 'Telugu',
      rating: '8.9',
      duration: '2h 40m',
      year: '1998',
      desc: 'Balu falls in love at first sight with Anu, an NRI girl. Through a series of events, they develop a deep friendship, but Anu must return to the US.',
      poster: './assets/toli.png',
      video: './assets/toli.mp4',
      isFree: true,
      cast: 'Pawan Kalyan, Keerthi Reddy'
    },
    {
      id: 'tammudu',
      title: 'Thammudu',
      category: 'classics',
      language: 'Telugu',
      rating: '8.6',
      duration: '2h 45m',
      year: '1999',
      desc: 'A careless college student is kicked out by his father. When his boxing champion brother is injured, he steps up to fight in his place.',
      poster: './assets/tammu.png',
      video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      isFree: true,
      cast: 'Pawan Kalyan, Preeti Jhangiani'
    }
  ];

  // Post-processing mapping to enrich movies with official YouTube high-definition trailer embed links
  const youtubeMap = {
    'salaar': 'https://www.youtube.com/embed/fR-w3i3Jt_I',
    'guntur': 'https://www.youtube.com/embed/DYLG65xz55U',
    'hanuman': 'https://www.youtube.com/embed/Oqvly3MvlXA',
    'leo': 'https://www.youtube.com/embed/Po3jJhKDMV8',
    'jailer': 'https://www.youtube.com/embed/xenOE1T_OT8',
    'dunki': 'https://www.youtube.com/embed/PVnS7-D3Wug',
    'family': 'https://www.youtube.com/embed/qVjS5L4QYx0',
    'premalu': 'https://www.youtube.com/embed/t81xZ9LpB80',
    'miller': 'https://www.youtube.com/embed/U38Qd9y6wP8',
    'nayak': 'https://www.youtube.com/embed/11s4o10h4z4',
    'hinanna': 'https://www.youtube.com/embed/hiRzLekYc_g',
    'bahubali': 'https://www.youtube.com/embed/G62HrubdD6o',
    'sitaramam': 'https://www.youtube.com/embed/l59C6s9VnHY',
    'vikram': 'https://www.youtube.com/embed/OKBMCL-FRis',
    'don': 'https://www.youtube.com/embed/V6_V7-Jp9XU',
    'varisu': 'https://www.youtube.com/embed/9f7a7j3oN8k',
    'kaithi': 'https://www.youtube.com/embed/g2J0b8tK6nE',
    'kgf2': 'https://www.youtube.com/embed/Qah9sSIXit0',
    'kantara': 'https://www.youtube.com/embed/8Fip7Q0DuA0',
    'vkrona': 'https://www.youtube.com/embed/8vB0Q59pW8U',
    'kurup': 'https://www.youtube.com/embed/N0vKzY9jQ_Q',
    'kaduva': 'https://www.youtube.com/embed/O41yqFf3Tq0',
    'jalsa': 'https://www.youtube.com/embed/k8oZ7B6C8uU',
    'kushi': 'https://www.youtube.com/embed/H5h9H-Gq2oE',
    'toli': 'https://www.youtube.com/embed/k8oZ7B6C8uU',
    'tammudu': 'https://www.youtube.com/embed/5T5J6B5S5Q8'
  };

  // Post-processing mapping to correct movie photos/posters
  const posterMap = {
    'salaar': 'https://i.redd.it/wbm0bnwus3ud1.jpeg',
    'guntur': 'https://i0.wp.com/beeafteryou.com/wp-content/uploads/2024/01/guntur-karam.jpg?resize=676%2C957&ssl=1',
    'hanuman': 'https://www.bollywoodhungama.com/wp-content/uploads/2024/01/HanuMan-1.jpg', // Teja Sajja Hanu-Man poster!
    'leo': 'https://static.moviecrow.com/gallery/20230918/221063-Leo%20Vijay%20Kannada.jpg',
    'jailer': 'https://m.media-amazon.com/images/M/MV5BNDA5YzlhNjItMDgxNC00MjQ4LWIzMDMtYTUyMzBhNjViNDk3XkEyXkFqcGdeQXVyMTY3ODkyNDkz._V1_.jpg',
    'dunki': 'https://m.media-amazon.com/images/M/MV5BODlhNDU2NjctYTg2Yi00ZDIzLTlkYzQtNGE5NzczNjNkODcxXkEyXkFqcGdeQXVyNDIyOTI5NzQ@._V1_FMjpg_UX1000_.jpg',
    'family': 'https://assets-in.bmscdn.com/iedb/movies/images/mobile/thumbnail/xlarge/the-family-star-et00373701-1711976553.jpg',
    'premalu': 'https://mir-s3-cdn-cf.behance.net/project_modules/max_3840/10cbd9185852421.65ca1cecbe87b.jpg',
    'miller': 'https://m.media-amazon.com/images/M/MV5BZWU2MjQ1MzAtNGMyOC00ZTFjLThkMjEtNmM1OWM3ZmM0YmI2XkEyXkFqcGdeQXVyMTUyNjIwMDEw._V1_FMjpg_UX1000_.jpg',
    'nayak': 'https://m.media-amazon.com/images/M/MV5BYzFjZGU3ZDUtZDE1OC00MzQ1LTk4MWEtZjIzOWVmN2FiZmEyXkEyXkFqcGc@._V1_.jpg',
    'hinanna': 'https://m.media-amazon.com/images/M/MV5BYmFmODcxMDMtYzk2My00NDZkLWEzNDktZWE0MDY1M2E1OWI1XkEyXkFqcGc@._V1_.jpg',
    'bahubali': './assets/bahu.png',
    'sitaramam': './assets/ram.png',
    'vikram': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMz9FSAUFClzU5FKohGxc4BeoK32UqLGxVusaEjpoRXs0rd44FbglU9kM&s=10',
    'don': 'https://m.media-amazon.com/images/M/MV5BZWYxZjE5MDctMjFkMy00NDA5LTkxY2EtOGU5YjVhZjliNmZlXkEyXkFqcGc@._V1_.jpg',
    'varisu': 'https://play-lh.googleusercontent.com/proxy/gRPHeECQNwkdD8kkB2i5-5rppHlS_yQ2vJMmXXjZtEUMpqba5ztEsLJPKChvhcvM-F93t6xPccejWlkFxhU563KzOVaOI2FkBRKl58hfh2qVGMiG29dxB9w5ftJrNufGJ4vjeDsN9giveW811W09pUyk3MzGo-XvQEQ3NQ',
    'kaithi': 'https://m.media-amazon.com/images/M/MV5BZjQyNThhMjQtZDgzNC00N2U4LWFhNjMtNWVlMzIxNWIxNTUwXkEyXkFqcGdeQXVyMTYyNjAzOTUx._V1_.jpg',
    'kgf2': 'https://m.media-amazon.com/images/M/MV5BZmQzZjVkZTUtYjI4ZC00ZDJmLWI0ZDUtZTFmMGM1Mzc5ZjIyXkEyXkFqcGc@._V1_.jpg',
    'kantara': 'https://m.media-amazon.com/images/M/MV5BY2VkZjk5ZjMtM2ExOS00ZDA1LTg1ZDEtYTliNGZiYTc4ZWZiXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
    'vkrona': 'https://assetscdn1.paytm.com/images/cinema/Vikrant-Rona1--fd2be8c0-db2c-11ec-a298-e50df7f56a2b.jpg',
    'kurup': 'https://mir-s3-cdn-cf.behance.net/project_modules/fs/ffae1b101795591.5f27bdbfd2bce.jpg',
    'kaduva': 'https://upload.wikimedia.org/wikipedia/en/3/38/Kaduva.film.jpg',
    'jalsa': 'https://m.media-amazon.com/images/M/MV5BNzExMGRjOWUtNWJmYi00ZjAyLWJkNTMtNjZiMTA3M2YyOTYwXkEyXkFqcGc@._V1_.jpg',
    'kushi': './assets/kushi.png',
    'toli': './assets/toli.png',
    'tammudu': './assets/tammu.png'
  };

  moviesDatabase.forEach(m => {
    m.youtube = youtubeMap[m.id] || 'https://www.youtube.com/embed/OKBMCL-FRis';
    m.poster = posterMap[m.id] || m.poster;
  });

  // Default initial guest user
  const GUEST_USER = {
    username: 'Guest User',
    email: 'guest@netprime.com',
    avatar: 'avatar1.png',
    tier: 'FREE' // FREE or PREMIUM
  };

  // State Manager Class
  class StateManager {
    constructor() {
      this.currentUser = this.loadUser();
      this.wishlist = this.loadWishlist();
      this.movies = moviesDatabase;
      
      // Perform initial check on startup
      this.checkPlanExpiry();
      
      // Setup background validation checker (runs every 5 seconds)
      setInterval(() => {
        this.checkPlanExpiry();
      }, 5000);
    }

    loadUser() {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUser) {
        try {
          return JSON.parse(savedUser);
        } catch(e) {
          return GUEST_USER;
        }
      }
      return GUEST_USER;
    }

    saveUser(user) {
      this.currentUser = user;
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      this.triggerEvent('userChange', user);
    }

    loadWishlist() {
      const savedWishlist = localStorage.getItem(STORAGE_KEY_WISHLIST);
      if (savedWishlist) {
        try {
          return JSON.parse(savedWishlist);
        } catch(e) {
          return [];
        }
      }
      return [];
    }

    saveWishlist(list) {
      this.wishlist = list;
      localStorage.setItem(STORAGE_KEY_WISHLIST, JSON.stringify(list));
      this.triggerEvent('wishlistChange', list);
    }

    getCurrentUser() {
      return this.currentUser;
    }

    isPremium() {
      return this.currentUser && this.currentUser.tier !== 'FREE';
    }

    login(username, email, avatar = 'avatar1.png') {
      const user = {
        username: username,
        email: email,
        avatar: avatar,
        tier: 'FREE' // Starts as free
      };
      this.saveUser(user);
      this.saveWishlist([]); // Clear wishlist for new user
    }

    loginWithGoogle(name, email, avatar) {
      const user = {
        username: name,
        email: email,
        avatar: avatar || 'avatar3.png',
        tier: 'FREE'
      };
      this.saveUser(user);
      this.saveWishlist([]);
    }

    logout() {
      this.saveUser(GUEST_USER);
      this.saveWishlist([]);
      window.location.reload();
    }

    upgradeToPremium(tierName = 'TRIAL') {
      if (this.currentUser) {
        let validityMs = 30 * 24 * 60 * 60 * 1000; // default 30 days
        if (tierName === 'TRIAL') {
          validityMs = 60 * 1000; // 1 minute validity for Trial so the user can test the automatic expiration!
        } else if (tierName === 'MONTHLY') {
          validityMs = 30 * 24 * 60 * 60 * 1000; // 30 days
        } else if (tierName === 'YEARLY') {
          validityMs = 365 * 24 * 60 * 60 * 1000; // 365 days
        }

        const updatedUser = { 
          ...this.currentUser, 
          tier: tierName,
          planStartDate: Date.now(),
          planExpiryDate: Date.now() + validityMs
        };
        this.saveUser(updatedUser);
      }
    }

    checkPlanExpiry() {
      if (this.currentUser && this.currentUser.tier !== 'FREE' && this.currentUser.planExpiryDate) {
        if (Date.now() > this.currentUser.planExpiryDate) {
          // Demote back to FREE tier
          const updatedUser = {
            ...this.currentUser,
            tier: 'FREE',
            planStartDate: null,
            planExpiryDate: null
          };
          this.saveUser(updatedUser);

          // Alert user through custom toast notification
          setTimeout(() => {
            if (window.showToastMessage) {
              window.showToastMessage('Your premium subscription validity has completed. Demoted to normal user.');
            } else {
              const toast = document.createElement('div');
              toast.id = 'netprime-toast';
              toast.style.cssText = `
                position: fixed;
                bottom: 30px;
                right: 30px;
                background: rgba(255, 0, 127, 0.95);
                color: #fff;
                padding: 14px 24px;
                border-radius: 8px;
                z-index: 10000;
                font-family: sans-serif;
                font-size: 0.9rem;
                box-shadow: 0 5px 15px rgba(255,0,127,0.3);
                animation: slideIn 0.3s ease forwards;
              `;
              toast.textContent = 'Your premium subscription validity has completed. Reverted to normal user.';
              document.body.appendChild(toast);
              setTimeout(() => {
                toast.remove();
              }, 4000);
            }
          }, 500);

          // Reload after toast fades so that premium content locks back up
          setTimeout(() => {
            window.location.reload();
          }, 4500);
        }
      }
    }

    getWishlist() {
      return this.wishlist;
    }

    isInWishlist(movieId) {
      return this.wishlist.includes(movieId);
    }

    addToWishlist(movieId) {
      if (!this.wishlist.includes(movieId)) {
        const updated = [...this.wishlist, movieId];
        this.saveWishlist(updated);
      }
    }

    removeFromWishlist(movieId) {
      const updated = this.wishlist.filter(id => id !== movieId);
      this.saveWishlist(updated);
    }

    getMovieById(movieId) {
      return this.movies.find(m => m.id === movieId);
    }

    getMoviesByCategory(category) {
      if (category === 'trending') {
        const featuredIds = ['hanuman', 'vikram', 'jalsa'];
        // Get the featured movies
        const featuredMovies = this.movies.filter(m => featuredIds.includes(m.id));
        // Sort them so they appear in order: hanuman, vikram, jalsa
        featuredMovies.sort((a, b) => featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id));
        
        // Get other trending movies (Telugu and Tamil)
        const otherTrending = this.movies.filter(m => 
          (m.category === 'telugu' || m.category === 'tamil') && !featuredIds.includes(m.id)
        );
        
        // Combine them and slice to top 10 movies
        return [...featuredMovies, ...otherTrending].slice(0, 10);
      }
      return this.movies.filter(m => m.category === category);
    }

    // Custom events trigger
    triggerEvent(eventName, detail) {
      const event = new CustomEvent('netprime_' + eventName, { detail: detail });
      window.dispatchEvent(event);
      
      // Dispatch standard DOM events to notify elements that might be listening across tabs
      localStorage.setItem('netprime_event_sync', JSON.stringify({
        name: eventName,
        detail: detail,
        timestamp: Date.now()
      }));
    }
  }

  // Bind to global window object
  window.NetPrimeState = new StateManager();

  // Cross-tab synchronization
  window.addEventListener('storage', function(e) {
    if (e.key === 'netprime_event_sync' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data.name === 'userChange') {
          window.NetPrimeState.currentUser = window.NetPrimeState.loadUser();
          window.dispatchEvent(new CustomEvent('netprime_userChange', { detail: window.NetPrimeState.currentUser }));
        } else if (data.name === 'wishlistChange') {
          window.NetPrimeState.wishlist = window.NetPrimeState.loadWishlist();
          window.dispatchEvent(new CustomEvent('netprime_wishlistChange', { detail: window.NetPrimeState.wishlist }));
        }
      } catch(err) {}
    }
  });

  // Shared Theme Switcher Initialization
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Check saved preference
    const savedTheme = localStorage.getItem('netprime_theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    }
    
    // 2. Set correct initial icon
    const themeIcon = document.getElementById('theme-toggle-icon');
    if (themeIcon) {
      themeIcon.className = savedTheme === 'light' ? 'fa fa-sun' : 'fa fa-moon';
    }
    
    // 3. Listen for toggle click
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isCurrentlyLight = document.documentElement.classList.contains('light-theme');
        if (isCurrentlyLight) {
          document.documentElement.classList.remove('light-theme');
          localStorage.setItem('netprime_theme', 'dark');
          if (themeIcon) themeIcon.className = 'fa fa-moon';
        } else {
          document.documentElement.classList.add('light-theme');
          localStorage.setItem('netprime_theme', 'light');
          if (themeIcon) themeIcon.className = 'fa fa-sun';
        }
      });
    }
  });

})();
