import { Team } from "@/lib/types";

/**
 * The 48 qualified teams as drawn on 5 Dec 2025 in Washington, DC.
 * baseElo values are pre-tournament strength estimates (Elo-style scale);
 * they evolve in TournamentState.elo as results are recorded.
 * keyPlayers.importance feeds the injury-impact model (0–1).
 */
export const TEAMS: Team[] = [
  // ─── Group A ───
  {
    id: "MEX", name: "Mexico", flag: "🇲🇽", group: "A", baseElo: 1850, fifaRank: 14,
    keyPlayers: [
      { name: "Santiago Giménez", position: "FW", importance: 0.8 },
      { name: "Edson Álvarez", position: "MF", importance: 0.75 },
      { name: "Luis Romo", position: "MF", importance: 0.55 },
    ],
  },
  {
    id: "RSA", name: "South Africa", flag: "🇿🇦", group: "A", baseElo: 1700, fifaRank: 56,
    keyPlayers: [
      { name: "Ronwen Williams", position: "GK", importance: 0.65 },
      { name: "Teboho Mokoena", position: "MF", importance: 0.6 },
      { name: "Themba Zwane", position: "MF", importance: 0.55 },
    ],
  },
  {
    id: "KOR", name: "South Korea", flag: "🇰🇷", group: "A", baseElo: 1795, fifaRank: 22,
    keyPlayers: [
      { name: "Son Heung-min", position: "FW", importance: 0.85 },
      { name: "Lee Kang-in", position: "MF", importance: 0.8 },
      { name: "Kim Min-jae", position: "DF", importance: 0.8 },
    ],
  },
  {
    id: "CZE", name: "Czechia", flag: "🇨🇿", group: "A", baseElo: 1810, fifaRank: 31,
    keyPlayers: [
      { name: "Patrik Schick", position: "FW", importance: 0.8 },
      { name: "Tomáš Souček", position: "MF", importance: 0.7 },
      { name: "Antonín Barák", position: "MF", importance: 0.55 },
    ],
  },

  // ─── Group B ───
  {
    id: "CAN", name: "Canada", flag: "🇨🇦", group: "B", baseElo: 1810, fifaRank: 28,
    keyPlayers: [
      { name: "Alphonso Davies", position: "DF", importance: 0.9 },
      { name: "Jonathan David", position: "FW", importance: 0.85 },
      { name: "Stephen Eustáquio", position: "MF", importance: 0.65 },
    ],
  },
  {
    id: "SUI", name: "Switzerland", flag: "🇨🇭", group: "B", baseElo: 1860, fifaRank: 17,
    keyPlayers: [
      { name: "Granit Xhaka", position: "MF", importance: 0.85 },
      { name: "Manuel Akanji", position: "DF", importance: 0.8 },
      { name: "Breel Embolo", position: "FW", importance: 0.7 },
    ],
  },
  {
    id: "QAT", name: "Qatar", flag: "🇶🇦", group: "B", baseElo: 1660, fifaRank: 51,
    keyPlayers: [
      { name: "Akram Afif", position: "FW", importance: 0.85 },
      { name: "Almoez Ali", position: "FW", importance: 0.75 },
      { name: "Bassam Al-Rawi", position: "DF", importance: 0.55 },
    ],
  },
  {
    id: "BIH", name: "Bosnia & Herzegovina", flag: "🇧🇦", group: "B", baseElo: 1750, fifaRank: 70,
    keyPlayers: [
      { name: "Edin Džeko", position: "FW", importance: 0.75 },
      { name: "Ermedin Demirović", position: "FW", importance: 0.7 },
      { name: "Sead Kolašinac", position: "DF", importance: 0.6 },
    ],
  },

  // ─── Group C ───
  {
    id: "BRA", name: "Brazil", flag: "🇧🇷", group: "C", baseElo: 2040, fifaRank: 5,
    keyPlayers: [
      { name: "Vinícius Júnior", position: "FW", importance: 0.9 },
      { name: "Rodrygo", position: "FW", importance: 0.8 },
      { name: "Alisson", position: "GK", importance: 0.8 },
    ],
  },
  {
    id: "MAR", name: "Morocco", flag: "🇲🇦", group: "C", baseElo: 1915, fifaRank: 12,
    keyPlayers: [
      { name: "Achraf Hakimi", position: "DF", importance: 0.9 },
      { name: "Brahim Díaz", position: "MF", importance: 0.75 },
      { name: "Yassine Bounou", position: "GK", importance: 0.75 },
    ],
  },
  {
    id: "SCO", name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "C", baseElo: 1755, fifaRank: 38,
    keyPlayers: [
      { name: "Scott McTominay", position: "MF", importance: 0.85 },
      { name: "Andy Robertson", position: "DF", importance: 0.75 },
      { name: "John McGinn", position: "MF", importance: 0.7 },
    ],
  },
  {
    id: "HAI", name: "Haiti", flag: "🇭🇹", group: "C", baseElo: 1590, fifaRank: 84,
    keyPlayers: [
      { name: "Danley Jean Jacques", position: "MF", importance: 0.65 },
      { name: "Frantzdy Pierrot", position: "FW", importance: 0.6 },
      { name: "Duckens Nazon", position: "FW", importance: 0.55 },
    ],
  },

  // ─── Group D ───
  {
    id: "USA", name: "United States", flag: "🇺🇸", group: "D", baseElo: 1840, fifaRank: 15,
    keyPlayers: [
      { name: "Christian Pulisic", position: "FW", importance: 0.9 },
      { name: "Antonee Robinson", position: "DF", importance: 0.7 },
      { name: "Weston McKennie", position: "MF", importance: 0.7 },
    ],
  },
  {
    id: "TUR", name: "Türkiye", flag: "🇹🇷", group: "D", baseElo: 1870, fifaRank: 25,
    keyPlayers: [
      { name: "Arda Güler", position: "MF", importance: 0.85 },
      { name: "Hakan Çalhanoğlu", position: "MF", importance: 0.85 },
      { name: "Kenan Yıldız", position: "FW", importance: 0.8 },
    ],
  },
  {
    id: "AUS", name: "Australia", flag: "🇦🇺", group: "D", baseElo: 1760, fifaRank: 26,
    keyPlayers: [
      { name: "Jackson Irvine", position: "MF", importance: 0.65 },
      { name: "Mathew Ryan", position: "GK", importance: 0.65 },
      { name: "Riley McGree", position: "MF", importance: 0.6 },
    ],
  },
  {
    id: "PAR", name: "Paraguay", flag: "🇵🇾", group: "D", baseElo: 1790, fifaRank: 39,
    keyPlayers: [
      { name: "Miguel Almirón", position: "MF", importance: 0.75 },
      { name: "Julio Enciso", position: "FW", importance: 0.75 },
      { name: "Gustavo Gómez", position: "DF", importance: 0.7 },
    ],
  },

  // ─── Group E ───
  {
    id: "GER", name: "Germany", flag: "🇩🇪", group: "E", baseElo: 1980, fifaRank: 9,
    keyPlayers: [
      { name: "Jamal Musiala", position: "MF", importance: 0.9 },
      { name: "Florian Wirtz", position: "MF", importance: 0.9 },
      { name: "Joshua Kimmich", position: "MF", importance: 0.8 },
    ],
  },
  {
    id: "ECU", name: "Ecuador", flag: "🇪🇨", group: "E", baseElo: 1900, fifaRank: 23,
    keyPlayers: [
      { name: "Moisés Caicedo", position: "MF", importance: 0.9 },
      { name: "Piero Hincapié", position: "DF", importance: 0.75 },
      { name: "Kendry Páez", position: "MF", importance: 0.7 },
    ],
  },
  {
    id: "CIV", name: "Ivory Coast", flag: "🇨🇮", group: "E", baseElo: 1770, fifaRank: 42,
    keyPlayers: [
      { name: "Franck Kessié", position: "MF", importance: 0.75 },
      { name: "Simon Adingra", position: "FW", importance: 0.7 },
      { name: "Sébastien Haller", position: "FW", importance: 0.7 },
    ],
  },
  {
    id: "CUW", name: "Curaçao", flag: "🇨🇼", group: "E", baseElo: 1600, fifaRank: 82,
    keyPlayers: [
      { name: "Juninho Bacuna", position: "MF", importance: 0.65 },
      { name: "Leandro Bacuna", position: "MF", importance: 0.6 },
      { name: "Tahith Chong", position: "FW", importance: 0.6 },
    ],
  },

  // ─── Group F ───
  {
    id: "NED", name: "Netherlands", flag: "🇳🇱", group: "F", baseElo: 2000, fifaRank: 7,
    keyPlayers: [
      { name: "Virgil van Dijk", position: "DF", importance: 0.85 },
      { name: "Frenkie de Jong", position: "MF", importance: 0.85 },
      { name: "Cody Gakpo", position: "FW", importance: 0.8 },
    ],
  },
  {
    id: "JPN", name: "Japan", flag: "🇯🇵", group: "F", baseElo: 1885, fifaRank: 18,
    keyPlayers: [
      { name: "Takefusa Kubo", position: "MF", importance: 0.85 },
      { name: "Kaoru Mitoma", position: "FW", importance: 0.8 },
      { name: "Wataru Endo", position: "MF", importance: 0.75 },
    ],
  },
  {
    id: "SWE", name: "Sweden", flag: "🇸🇪", group: "F", baseElo: 1820, fifaRank: 43,
    keyPlayers: [
      { name: "Alexander Isak", position: "FW", importance: 0.9 },
      { name: "Viktor Gyökeres", position: "FW", importance: 0.85 },
      { name: "Dejan Kulusevski", position: "MF", importance: 0.75 },
    ],
  },
  {
    id: "TUN", name: "Tunisia", flag: "🇹🇳", group: "F", baseElo: 1735, fifaRank: 46,
    keyPlayers: [
      { name: "Hannibal Mejbri", position: "MF", importance: 0.7 },
      { name: "Aïssa Laïdouni", position: "MF", importance: 0.65 },
      { name: "Youssef Msakni", position: "FW", importance: 0.6 },
    ],
  },

  // ─── Group G ───
  {
    id: "BEL", name: "Belgium", flag: "🇧🇪", group: "G", baseElo: 1935, fifaRank: 8,
    keyPlayers: [
      { name: "Kevin De Bruyne", position: "MF", importance: 0.85 },
      { name: "Jérémy Doku", position: "FW", importance: 0.8 },
      { name: "Romelu Lukaku", position: "FW", importance: 0.8 },
    ],
  },
  {
    id: "EGY", name: "Egypt", flag: "🇪🇬", group: "G", baseElo: 1760, fifaRank: 34,
    keyPlayers: [
      { name: "Mohamed Salah", position: "FW", importance: 0.95 },
      { name: "Omar Marmoush", position: "FW", importance: 0.8 },
      { name: "Mohamed Elneny", position: "MF", importance: 0.55 },
    ],
  },
  {
    id: "IRN", name: "Iran", flag: "🇮🇷", group: "G", baseElo: 1800, fifaRank: 21,
    keyPlayers: [
      { name: "Mehdi Taremi", position: "FW", importance: 0.85 },
      { name: "Sardar Azmoun", position: "FW", importance: 0.7 },
      { name: "Alireza Jahanbakhsh", position: "FW", importance: 0.6 },
    ],
  },
  {
    id: "NZL", name: "New Zealand", flag: "🇳🇿", group: "G", baseElo: 1640, fifaRank: 86,
    keyPlayers: [
      { name: "Chris Wood", position: "FW", importance: 0.8 },
      { name: "Liberato Cacace", position: "DF", importance: 0.6 },
      { name: "Marko Stamenić", position: "MF", importance: 0.55 },
    ],
  },

  // ─── Group H ───
  {
    id: "ESP", name: "Spain", flag: "🇪🇸", group: "H", baseElo: 2190, fifaRank: 1,
    keyPlayers: [
      { name: "Lamine Yamal", position: "FW", importance: 0.95 },
      { name: "Pedri", position: "MF", importance: 0.9 },
      { name: "Rodri", position: "MF", importance: 0.9 },
    ],
  },
  {
    id: "URU", name: "Uruguay", flag: "🇺🇾", group: "H", baseElo: 1925, fifaRank: 16,
    keyPlayers: [
      { name: "Federico Valverde", position: "MF", importance: 0.9 },
      { name: "Darwin Núñez", position: "FW", importance: 0.8 },
      { name: "Ronald Araújo", position: "DF", importance: 0.75 },
    ],
  },
  {
    id: "KSA", name: "Saudi Arabia", flag: "🇸🇦", group: "H", baseElo: 1700, fifaRank: 60,
    keyPlayers: [
      { name: "Salem Al-Dawsari", position: "FW", importance: 0.8 },
      { name: "Firas Al-Buraikan", position: "FW", importance: 0.65 },
      { name: "Saud Abdulhamid", position: "DF", importance: 0.55 },
    ],
  },
  {
    id: "CPV", name: "Cape Verde", flag: "🇨🇻", group: "H", baseElo: 1620, fifaRank: 68,
    keyPlayers: [
      { name: "Ryan Mendes", position: "FW", importance: 0.65 },
      { name: "Jamiro Monteiro", position: "MF", importance: 0.6 },
      { name: "Bebé", position: "FW", importance: 0.55 },
    ],
  },

  // ─── Group I ───
  {
    id: "FRA", name: "France", flag: "🇫🇷", group: "I", baseElo: 2080, fifaRank: 3,
    keyPlayers: [
      { name: "Kylian Mbappé", position: "FW", importance: 0.95 },
      { name: "Aurélien Tchouaméni", position: "MF", importance: 0.8 },
      { name: "William Saliba", position: "DF", importance: 0.8 },
    ],
  },
  {
    id: "NOR", name: "Norway", flag: "🇳🇴", group: "I", baseElo: 1900, fifaRank: 29,
    keyPlayers: [
      { name: "Erling Haaland", position: "FW", importance: 0.95 },
      { name: "Martin Ødegaard", position: "MF", importance: 0.85 },
      { name: "Antonio Nusa", position: "FW", importance: 0.7 },
    ],
  },
  {
    id: "SEN", name: "Senegal", flag: "🇸🇳", group: "I", baseElo: 1840, fifaRank: 19,
    keyPlayers: [
      { name: "Sadio Mané", position: "FW", importance: 0.8 },
      { name: "Pape Matar Sarr", position: "MF", importance: 0.75 },
      { name: "Kalidou Koulibaly", position: "DF", importance: 0.7 },
    ],
  },
  {
    id: "IRQ", name: "Iraq", flag: "🇮🇶", group: "I", baseElo: 1660, fifaRank: 58,
    keyPlayers: [
      { name: "Aymen Hussein", position: "FW", importance: 0.65 },
      { name: "Ali Al-Hamadi", position: "FW", importance: 0.6 },
      { name: "Ibrahim Bayesh", position: "MF", importance: 0.6 },
    ],
  },

  // ─── Group J ───
  {
    id: "ARG", name: "Argentina", flag: "🇦🇷", group: "J", baseElo: 2155, fifaRank: 2,
    keyPlayers: [
      { name: "Lionel Messi", position: "FW", importance: 0.95 },
      { name: "Julián Álvarez", position: "FW", importance: 0.85 },
      { name: "Enzo Fernández", position: "MF", importance: 0.8 },
    ],
  },
  {
    id: "AUT", name: "Austria", flag: "🇦🇹", group: "J", baseElo: 1860, fifaRank: 24,
    keyPlayers: [
      { name: "Christoph Baumgartner", position: "MF", importance: 0.75 },
      { name: "David Alaba", position: "DF", importance: 0.75 },
      { name: "Marcel Sabitzer", position: "MF", importance: 0.7 },
    ],
  },
  {
    id: "ALG", name: "Algeria", flag: "🇩🇿", group: "J", baseElo: 1790, fifaRank: 36,
    keyPlayers: [
      { name: "Riyad Mahrez", position: "FW", importance: 0.8 },
      { name: "Amine Gouiri", position: "FW", importance: 0.75 },
      { name: "Houssem Aouar", position: "MF", importance: 0.65 },
    ],
  },
  {
    id: "JOR", name: "Jordan", flag: "🇯🇴", group: "J", baseElo: 1650, fifaRank: 64,
    keyPlayers: [
      { name: "Mousa Al-Taamari", position: "FW", importance: 0.8 },
      { name: "Yazan Al-Naimat", position: "FW", importance: 0.65 },
      { name: "Ali Olwan", position: "FW", importance: 0.6 },
    ],
  },

  // ─── Group K ───
  {
    id: "POR", name: "Portugal", flag: "🇵🇹", group: "K", baseElo: 2045, fifaRank: 6,
    keyPlayers: [
      { name: "Bruno Fernandes", position: "MF", importance: 0.85 },
      { name: "Cristiano Ronaldo", position: "FW", importance: 0.85 },
      { name: "Rafael Leão", position: "FW", importance: 0.8 },
    ],
  },
  {
    id: "COL", name: "Colombia", flag: "🇨🇴", group: "K", baseElo: 1955, fifaRank: 13,
    keyPlayers: [
      { name: "Luis Díaz", position: "FW", importance: 0.9 },
      { name: "James Rodríguez", position: "MF", importance: 0.8 },
      { name: "Jhon Durán", position: "FW", importance: 0.7 },
    ],
  },
  {
    id: "UZB", name: "Uzbekistan", flag: "🇺🇿", group: "K", baseElo: 1700, fifaRank: 55,
    keyPlayers: [
      { name: "Abdukodir Khusanov", position: "DF", importance: 0.75 },
      { name: "Abbosbek Fayzullaev", position: "MF", importance: 0.7 },
      { name: "Eldor Shomurodov", position: "FW", importance: 0.7 },
    ],
  },
  {
    id: "COD", name: "DR Congo", flag: "🇨🇩", group: "K", baseElo: 1715, fifaRank: 49,
    keyPlayers: [
      { name: "Yoane Wissa", position: "FW", importance: 0.75 },
      { name: "Cédric Bakambu", position: "FW", importance: 0.65 },
      { name: "Chancel Mbemba", position: "DF", importance: 0.65 },
    ],
  },

  // ─── Group L ───
  {
    id: "ENG", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "L", baseElo: 2090, fifaRank: 4,
    keyPlayers: [
      { name: "Jude Bellingham", position: "MF", importance: 0.9 },
      { name: "Harry Kane", position: "FW", importance: 0.9 },
      { name: "Bukayo Saka", position: "FW", importance: 0.85 },
    ],
  },
  {
    id: "CRO", name: "Croatia", flag: "🇭🇷", group: "L", baseElo: 1905, fifaRank: 10,
    keyPlayers: [
      { name: "Joško Gvardiol", position: "DF", importance: 0.8 },
      { name: "Luka Modrić", position: "MF", importance: 0.8 },
      { name: "Mateo Kovačić", position: "MF", importance: 0.7 },
    ],
  },
  {
    id: "GHA", name: "Ghana", flag: "🇬🇭", group: "L", baseElo: 1735, fifaRank: 47,
    keyPlayers: [
      { name: "Mohammed Kudus", position: "MF", importance: 0.85 },
      { name: "Antoine Semenyo", position: "FW", importance: 0.8 },
      { name: "Thomas Partey", position: "MF", importance: 0.7 },
    ],
  },
  {
    id: "PAN", name: "Panama", flag: "🇵🇦", group: "L", baseElo: 1720, fifaRank: 33,
    keyPlayers: [
      { name: "Adalberto Carrasquilla", position: "MF", importance: 0.7 },
      { name: "Michael Murillo", position: "DF", importance: 0.6 },
      { name: "José Fajardo", position: "FW", importance: 0.6 },
    ],
  },
];

export const TEAM_BY_ID: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t]),
);

export const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;

export function teamsInGroup(group: string): Team[] {
  return TEAMS.filter((t) => t.group === group);
}
