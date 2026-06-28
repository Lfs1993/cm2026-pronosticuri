"use client";

import Link from "next/link";
import { useEffect, useState",import { useEffect, useState, useCallback } from "react";
  "New Zealand": "🇳🇿",
  Spain: "🇪🇸",
  "Cabo Verde": "🇨🇻",
  "Cape Verde": "🇨🇻",
  "Saudi Arabia": "🇸🇦",
  Uruguay: "🇺🇾",
  France: "🇫🇷",
  Senegal: "🇸🇳",
  Iraq: "🇮🇶",
  Norway: "🇳🇴",
  Argentina: "🇦🇷",
  Algeria: "🇩🇿",
  Austria: "🇦🇹",
  Jordan: "🇯🇴",
  Portugal: "🇵🇹",
  "DR Congo": "🇨🇩",
  Uzbekistan: "🇺🇿",
  Colombia: "🇨🇴",
  England: "🏴",
  Croatia: "🇭🇷",
  Ghana: "🇬🇭",
  Panama: "🇵🇦",
};

const STAGE_LABELS: Record<string, string> = {
  groups: "Grupe",
  round32: "Șaisprezecimi",
  round16: "Optimi",
  quarter: "Sferturi",
  semi: "Semifinale",
  third: "Finala mică",
  final: "Finala",
};

const STAGE_ORDER = [
  "groups",
  "round32",
  "round16",
  "quarter",
  "semi",
  "third",
  "final",
];

function TeamName({
  team,
  align = "left",
}: {
  team: string;
  align?: "left" | "right";
}) {
  const flag = TEAM_FLAGS[team] ?? "";

  return (
    <span
      className={`inline-flex items-center gap-2 ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
    >
      {align === "right" ? (
        <>
          <span>{team}</span>
          {flag ? <span className="text-lg">{flag}</span> : null}
        </>
      ) : (
        <>
          {flag ? <span className="text-lg">{flag}</span> : null}
          <span>{team}</span>
        </>
      )}
    </span>
  );
}
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ActivePhaseControl from "@/components/admin/ActivePhaseControl";

type Match = {
  id: string;
  stage: string;
  group_name: string | null;
  matchday: number | null;
  order_index: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
};

type Prediction = {
  user_id: string;
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  profiles: { display_name: string }[] | null;
};

type Profile = {
  id: string;
  is_admin: boolean;
};

type UserPredictions = {
  user_id: string;
  display_name: string;
  predictions: Prediction[];
};

const TEAM_FLAGS: Record<string, string> = {
  Mexico: "🇲🇽",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  Czechia: "🇨🇿",
  Canada: "🇨🇦",
  "Bosnia and Herzegovina": "🇧🇦",
  Qatar: "🇶🇦",
  Switzerland: "🇨🇭",
  Brazil: "🇧🇷",
  Morocco: "🇲🇦",
  Haiti: "🇭🇹",
  Scotland: "🏴",
  USA: "🇺🇸",
  Paraguay: "🇵🇾",
  Australia: "🇦🇺",
  Türkiye: "🇹🇷",
  Germany: "🇩🇪",
  Curaçao: "🇨🇼",
  "Côte d'Ivoire": "🇨🇮",
  "Ivory Coast": "🇨🇮",
  Ecuador: "🇪🇨",
  Netherlands: "🇳🇱",
  Japan: "🇯🇵",
  Sweden: "🇸🇪",
  Tunisia: "🇹🇳",
  Belgium: "🇧🇪",
  Egypt: "🇪🇬",

  
