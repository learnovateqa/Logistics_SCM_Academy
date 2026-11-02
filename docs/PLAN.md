# Course plan (teacher reference: not linked from learner pages)

## Level 6 syllabus (approved)

12 sessions × 2 hours, one a week. Exams are inside the 12 sessions: 10 teaching sessions, midterm in S6, final in S12.

| # | Session | Stage | Built from |
|---|---|---|---|
| 1 | How supply chains work (SCOR, Six Rights, FLOW, digital supply chain) | Plan | Ch 1 + front matter + Ch 11 intro |
| 2 | Planning, forecasting and S&OP (+ bullwhip effect, AI forecasting) | Plan | Ch 8 |
| 3 | Procurement and supplier relationships | Source | Ch 2 + Ch 6 (merged) |
| 4 | International trade and global sourcing (+ Qatar 2017, Hamad Port) | Source | Ch 7 |
| 5 | Inventory and stock control | Make | Ch 3 |
| 6 | **Midterm** (S1–S5): 30 min review + 90 min exam | Make | — |
| 7 | Operations, quality and continuous improvement | Make | Ch 10 + Make content |
| 8 | Warehousing and e-commerce fulfilment | Deliver | Ch 4 + WMS/RFID |
| 9 | Transport, distribution and last mile | Deliver | Ch 5 + GPS/IoT |
| 10 | Risk and resilience (COVID, *Ever Given*, Red Sea, cyber) | Return & sustain | Ch 9 |
| 11 | Leading a sustainable, digital supply chain | Return & sustain | Ch 11 + Ch 12 (merged) + sustainability |
| 12 | **Final** (cumulative, weighted to S7–S11) | Return & sustain | — |

Corrections to the book that the content must apply: supplier matrix totals (A 4.10, B 3.83, C 3.75); rail fuel figure (~480 ton-miles per US gallon, not 500 km per litre); port-strike location; EOQ exact total 1,897; all 8 Lean wastes; Kraljic's four groups; FCA/CIP for containers; LIFO not allowed under IFRS.

## Colours

Plan `#00B4B4` · Source `#FF5A36` · Make `#8338EC` · Deliver `#1F7BFF` · Return & sustain `#00B86B`.
Navy `#14213D` for all text. Gold `#FFC300` for highlights only. Stage colours never sit behind text. White text only on navy.

## Build order

1. Sheet + Apps Script (`apps-script/`) ✅
2. Student app (Level 6 content; Levels 4 and 5 "Coming soon")
3. Teacher dashboard

## Interactives: Ms. Maria's notes (for Part 2)

These four are the specification. They replace the matching items in the earlier list.

1. **Multi-Tier Flow Simulator ("Bullwhip Effect" Challenge)**: live, game-like. The learner manages the product pipeline across three stages: **Suppliers, Internal Production, Retail/Distribution**. Customer demand changes week by week. The learner forecasts demand, sets order quantities and manages lead times. Over-ordering makes holding costs spike; under-ordering causes stockouts and lost revenue. It shows visually how small changes in consumer demand grow into large swings upstream. *(Original design; not a copy of any existing game.)*
2. **Supplier Selection Risk Matrix**: interactive dashboard to compare hypothetical **global and local** suppliers. Metrics: **cost per unit, lead time (days), quality defect rate, PESTEL risk factors** (shipping-route disruption, tariffs, political stability). Output: a **balanced supplier portfolio**, e.g. the cheapest supplier with a long lead time vs a local supplier with a higher cost but no shipping delay.
3. **Inventory & Working Capital Balancer**: sliders linked to the learner's company figures. The learner adjusts **safety stock, reorder points and batch sizes**. The tool shows the trade-off at once: cash tied up in stock vs the risk of stockouts and stopped operations.
4. **Supply Chain Disruption "Shock Test"**: crisis simulator. Mid-run, a random event hits (canal blockage, raw-material shortage, sudden fuel-price rise). With a **limited budget and time window**, the learner reroutes shipments, negotiates with backup suppliers or adjusts prices to protect the profit margin.

Also planned: Incoterms Explorer, Import Desk (landed cost via Hamad Port), Warehouse Slotting Puzzle, Doha Route Planner, Control Tower dashboard. Every interactive saves its result to the learner's **My Supply Chain** company.
