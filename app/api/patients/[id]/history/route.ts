import { NextResponse } from 'next/server';
import { ghlFetch, HC_NOTE_PREFIX } from '@/lib/ghl';

export const dynamic = 'force-dynamic';

type TimelineEntry = {
  type: 'appointment' | 'note';
  date: string | null;
  title: string;
  detail: string;
  status?: string;
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;

  try {
    const [appointmentsRes, notesRes] = await Promise.allSettled([
      ghlFetch<{ events: any[] }>(`/contacts/${contactId}/appointments`),
      ghlFetch<{ notes: any[] }>(`/contacts/${contactId}/notes`),
    ]);

    const appointments = appointmentsRes.status === 'fulfilled' ? appointmentsRes.value.events || [] : [];
    const notes = (notesRes.status === 'fulfilled' ? notesRes.value.notes || [] : []).filter(
      (n: any) => typeof n.body !== 'string' || !(n.body.startsWith(HC_NOTE_PREFIX) || n.body.startsWith('[HC-'))
    );

    const timeline: TimelineEntry[] = [
      ...appointments.map((a): TimelineEntry => ({
        type: 'appointment',
        date: a.startTime || a.dateAdded || null,
        title: a.title || 'Cita',
        detail: a.notes || '',
        status: a.appointmentStatus || a.status,
      })),
      ...notes.map((n): TimelineEntry => ({
        type: 'note',
        date: n.dateAdded || null,
        title: 'Nota',
        detail: n.body || '',
      })),
    ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    return NextResponse.json({
      timeline,
      appointmentsError: appointmentsRes.status === 'rejected' ? String(appointmentsRes.reason?.message || appointmentsRes.reason) : null,
      notesError: notesRes.status === 'rejected' ? String(notesRes.reason?.message || notesRes.reason) : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error al consultar la historia del paciente' },
      { status: 502 }
    );
  }
}
