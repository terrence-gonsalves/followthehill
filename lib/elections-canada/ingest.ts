// Elections Canada CSV ingestion helpers
// Used by scripts/ingest-donations.ts
import { parse } from "csv-parse"
import * as fs from "fs"
import type { Donation } from "@/types"

/**
 * Parse an Elections Canada contributions CSV file.
 * Column mapping varies by year — this handles the most common format.
 */
export async function parseElectionsCanadaCSV(
  filePath: string
): Promise<Partial<Donation>[]> {
  const records: Partial<Donation>[] = []

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(
        parse({
          columns: true,           // use header row as keys
          skip_empty_lines: true,
          trim: true,
          relax_quotes: true,
          encoding: "latin1",      // Elections Canada uses latin-1 encoding
        })
      )
      .on("data", (row: Record<string, string>) => {
        // Normalize common column name variants across years
        const contributor = row["Contributor"] || row["Contributor Name"] || row["Name"]
        const amount      = row["Amount"] || row["Contribution Amount"]
        const year        = row["Year"] || row["Fiscal Year"]
        const recipient   = row["Recipient Name"] || row["Recipient"]
        const recType     = row["Recipient Type"] || row["Entity Type"]
        const contType    = row["Contributor Type"] || row["Type"]
        const riding      = row["Electoral District Name"] || row["Riding"]
        const province    = row["Province"] || row["Prov"]

        if (!contributor || !amount || !year) return // skip malformed rows

        records.push({
          contributor_name: contributor.trim(),
          contributor_type: contType?.trim() || null,
          recipient_name:   recipient?.trim() || "",
          recipient_type:   normalizeRecipientType(recType),
          amount:           parseFloat(amount.replace(/[$,]/g, "")),
          year:             parseInt(year, 10),
          riding:           riding?.trim() || null,
          province:         province?.trim() || null,
          source:           "elections_canada",
        })
      })
      .on("end", () => resolve(records))
      .on("error", reject)
  })
}

function normalizeRecipientType(raw: string | undefined): Donation["recipient_type"] {
  const val = (raw || "").toLowerCase()
  if (val.includes("party"))        return "party"
  if (val.includes("candidate"))    return "candidate"
  if (val.includes("association"))  return "association"
  if (val.includes("leadership"))   return "leadership"
  return "candidate"
}
