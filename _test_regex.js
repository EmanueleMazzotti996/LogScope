const lines = [
    '[2025-01-28 14.39.00][DBG] BEGIN Parvis.ProcessControl.Client.Common.Global::Initialize',
    '[2025-03-03 06:23:33][DBG] BEGIN Parvis.ProcessControl.Client.Common.Global::Initialize',
    '[2025-03-03 06:23:33][DBG] END Parvis.ProcessControl.Client.Common.Global::Initialize'
];

const regex = /^\[(\d{4}-\d{2}-\d{2}\s\d{2}[:.]\d{2}[:.]\d{2})\]\[[^\]]+\]\s+(BEGIN|END)\s+(.+)$/;

lines.forEach(line => {
    const match = line.match(regex);
    if (match) {
        console.log("MATCH:");
        console.log("  Time:", match[1]);
        console.log("  Type:", match[2]);
        console.log("  Proc:", match[3]);
        const timeStr = match[1];
        // Replace spaces with T, and any dots with colons
        const isoTimeStr = timeStr.replace(' ', 'T').replace(/\./g, ':');
        console.log("  ISO:", isoTimeStr);
        console.log("  Timestamp:", new Date(isoTimeStr).getTime());
    } else {
        console.log("NO MATCH:", line);
    }
});
