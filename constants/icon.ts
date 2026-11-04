import activity from "@/assets/assets/icons/activity.png";
import add from "@/assets/assets/icons/add.png";
import adobe from "@/assets/assets/icons/adobe.png";
import back from "@/assets/assets/icons/back.png";
import canva from "@/assets/assets/icons/canva.png";
import claude from "@/assets/assets/icons/claude.png";
import dropbox from "@/assets/assets/icons/dropbox.png";
import figma from "@/assets/assets/icons/figma.png";
import github from "@/assets/assets/icons/github.png";
import home from "@/assets/assets/icons/home.png";
import medium from "@/assets/assets/icons/medium.png";
import menu from "@/assets/assets/icons/menu.png";
import notion from "@/assets/assets/icons/notion.png";
import openai from "@/assets/assets/icons/openai.png";
import plus from "@/assets/assets/icons/plus.png";
import setting from "@/assets/assets/icons/setting.png";
import spotify from "@/assets/assets/icons/spotify.png";
import wallet from "@/assets/assets/icons/wallet.png";

export const icons = {
  home,
  wallet,
  setting,
  activity,
  add,
  back,
  menu,
  plus,
  notion,
  dropbox,
  openai,
  adobe,
  medium,
  figma,
  spotify,
  github,
  claude,
  canva,
} as const;

export type IconKey = keyof typeof icons;
