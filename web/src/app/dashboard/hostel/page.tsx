export const dynamic = "force-dynamic";

import {
  getHostelRooms,
  getHostelAllocations,
  getNightAttendanceList,
  getHostelExitPermissionsList,
  getHostelVisitorsList,
} from "@/domains/hostel/actions/hostel.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import HostelClient from "./HostelClient";

export const metadata = {
  title: "Internat & Résidences Étudiantes | Edut",
  description: "Gestion des dortoirs, affectations de chambres, appel nocturne et sorties d'élèves",
};

export default async function HostelPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [roomsRes, allocationsRes, studentsRes, nightAttendanceRes, exitPermissionsRes, visitorsRes] =
    await Promise.all([
      getHostelRooms(),
      getHostelAllocations(),
      getStudents(),
      getNightAttendanceList(today),
      getHostelExitPermissionsList("ALL"),
      getHostelVisitorsList(today),
    ]);

  const rooms: any[] = (roomsRes as any).data?.data || (roomsRes as any).data || [];
  const allocations: any[] = (allocationsRes as any).data?.data || (allocationsRes as any).data || [];
  const students: any[] = (studentsRes as any).data || (studentsRes.data as any)?.data || [];
  const nightAttendance: any[] = (nightAttendanceRes as any).data?.data || (nightAttendanceRes as any).data || [];
  const exitPermissions: any[] = (exitPermissionsRes as any).data?.data || (exitPermissionsRes as any).data || [];
  const visitors: any[] = (visitorsRes as any).data?.data || (visitorsRes as any).data || [];

  return (
    <HostelClient
      rooms={rooms}
      allocations={allocations}
      students={students}
      initialNightAttendance={nightAttendance}
      initialExitPermissions={exitPermissions}
      initialVisitors={visitors}
    />
  );
}
