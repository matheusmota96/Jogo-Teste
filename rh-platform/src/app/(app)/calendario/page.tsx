import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import { isDbConfigured, prisma } from "@/lib/db";
import { Calendar, type BirthdayEvent, type AllHandsEvent, type CompanyEvent } from "./Calendar";
import { AddCompanyEventForm } from "./AddCompanyEventForm";

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
  let companyEvents: CompanyEvent[];
  try {
    const [people, meetings, events] = await Promise.all([
      prisma.collaborator.findMany({
        where: { status: "ACTIVE", birthDate: { not: null } },
        select: { id: true, name: true, birthDate: true },
      }),
      prisma.allHands.findMany({ select: { id: true, title: true, date: true } }),
      prisma.companyEvent.findMany({ select: { id: true, title: true, type: true, notes: true, date: true } }),
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

    companyEvents = events.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      notes: e.notes,
      year: e.date.getUTCFullYear(),
      month: e.date.getUTCMonth() + 1,
      day: e.date.getUTCDate(),
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
      <div className="row-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Calendario</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Aniversariantes, datas comemorativas, all hands e eventos B4you
          </p>
        </div>
        <AddCompanyEventForm />
      </div>
      <Calendar birthdays={birthdays} allHands={allHands} companyEvents={companyEvents} />
    </>
  );
}
