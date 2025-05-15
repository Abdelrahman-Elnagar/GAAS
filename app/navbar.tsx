
"use client";

import { useRouter } from "next/navigation";

export default function Navbar() {
const router = useRouter();

return (
    <nav style={{ display: "flex", gap: 20, padding: 10, borderBottom: "1px solid #ccc" }}>
    <button onClick={() => router.push("/")}>Tasks</button>
    <button onClick={() => router.push("/dashboard")}>Dashboard</button>
    <button onClick={() => router.push("/profile")}>Profile</button>
    </nav>
);
}
