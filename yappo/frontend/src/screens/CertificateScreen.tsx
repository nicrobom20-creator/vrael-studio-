import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Atmosphere } from "../components/World";
import { useApp } from "../state";

interface Paper {
  eligible: boolean;
  full: boolean;
  name: string;
  public_id: string;
  language: string;
  title: string;
  date: string;
}

export function CertificateScreen() {
  const { notify } = useApp();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<Paper | null>(null);

  useEffect(() => {
    api<Paper>("/api/certificate").then(setPaper).catch((error: Error) => notify(error.message));
  }, []);

  return (
    <Atmosphere padNav={false}>
      <div className="min-h-dvh px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
        <button type="button" className="text-sm text-cream/70" onClick={() => navigate("/profile")}>← профиль</button>
        <h1 className="mt-2 font-display text-4xl">Грамота</h1>
        {paper && !paper.eligible && <p className="mt-4 text-sm text-cream/75">Она откроется, когда закроешь первую главу.</p>}
        {paper?.eligible && (
          <article className="glass mt-4 border-gold p-6 text-center">
            <div className="text-[11px] uppercase tracking-[0.2em] text-gold2">Yappo</div>
            <div className="mt-3 font-display text-4xl">{paper.title}</div>
            <p className="mt-4 text-lg">{paper.name}</p>
            <p className="text-sm text-cream/70">{paper.language}</p>
            <p className="mt-2 text-xs text-cream/55">{paper.public_id} · {paper.date}</p>
            {paper.full && <p className="mt-3 text-sm text-gold2">Лондон, Нью-Йорк и Сидней пройдены.</p>}
          </article>
        )}
      </div>
    </Atmosphere>
  );
}
