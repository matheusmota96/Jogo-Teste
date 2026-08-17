import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import { isDbConfigured, prisma } from "@/lib/db";
import { Calendar, type BirthdayEvent, type AllHandsEvent } from "./Calendar";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  if (!isDbConfigured) {
    return (
      <>
        <h1 className="page-title">Calendario</h1>
        <DbNotice />
      </>
    );
  }

  let birthdays: BirthdayEvent[];
  let allHands: AllHandsEvent[];
  try {
    const [people, meetings] = await Promise.all([
      prisma.collaborator.findMany({
        where: { status: "ACTIVE", birthDate: { not: null } },
        select: { id: true, name: true, birthDate: true },
      }),
      prisma.allHands.findMany({ select: { id: true, title: true, date: true } }),
    ]);

    birthdays = people
      .filter((p) => p.birthDate)
      .map((p) => ({
        id: p.id,
        name: p.name,
        month: (p.birthDate as Date).getUTCMonth() + 1,
        day: (p.birthDate as Date).getUTCDate(),
      }));

    allHands = meetings.map((m) => ({
      id: m.id,
      title: m.title,
      year: m.date.getUTCFullYear(),
      month: m.date.getUTCMonth() + 1,
      day: m.date.getUTCDate(),
    }));
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">Calendario</h1>
          <DbNotice />
        </>
      );
    }
    throw err;
  }

  return (
    <>
      <h1 className="page-title">Calendario</h1>
      <p className="page-subtitle">Aniversariantes, datas comemorativas e all hands</p>
      <Calendar birthdays={birthdays} allHands={allHands} />
    </>
  );
}
