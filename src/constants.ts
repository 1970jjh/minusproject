
export const STARTING_CHIPS = 9; // 기본값 9억 (로비용)
export const CHIP_UNIT = "억";
export const MIN_CARD_VALUE = 26; // -26 Project
export const MAX_CARD_VALUE = 50; // -50 Project
export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;

// 팀 수에 따른 초기 칩 금액 계산
export const getStartingChipsByTeamCount = (teamCount: number): number => {
  if (teamCount <= 6) {
    return 12; // 6팀 이하: 12억
  } else if (teamCount <= 8) {
    return 10; // 7~8팀: 10억
  } else {
    return 8;  // 9팀 이상: 8억
  }
};

export const TEAM_COLORS = [
  { name: 'Red', bg: 'bg-red-600', border: 'border-red-400', text: 'text-red-100' },
  { name: 'Blue', bg: 'bg-blue-600', border: 'border-blue-400', text: 'text-blue-100' },
  { name: 'Green', bg: 'bg-green-600', border: 'border-green-400', text: 'text-green-100' },
  { name: 'Yellow', bg: 'bg-yellow-600', border: 'border-yellow-400', text: 'text-yellow-100' },
  { name: 'Purple', bg: 'bg-purple-600', border: 'border-purple-400', text: 'text-purple-100' },
  { name: 'Orange', bg: 'bg-orange-600', border: 'border-orange-400', text: 'text-orange-100' },
  { name: 'Teal', bg: 'bg-teal-600', border: 'border-teal-400', text: 'text-teal-100' },
  { name: 'Pink', bg: 'bg-pink-600', border: 'border-pink-400', text: 'text-pink-100' },
  { name: 'Indigo', bg: 'bg-indigo-600', border: 'border-indigo-400', text: 'text-indigo-100' },
  { name: 'Cyan', bg: 'bg-cyan-600', border: 'border-cyan-400', text: 'text-cyan-100' },
  { name: 'Rose', bg: 'bg-rose-600', border: 'border-rose-400', text: 'text-rose-100' },
  { name: 'Lime', bg: 'bg-lime-600', border: 'border-lime-400', text: 'text-lime-100' },
];
