import fitz
import os

doc = fitz.open()

# Page 1: Title and Welcome
page1 = doc.new_page()
page1.insert_text((50, 50), "AXIS ATLAS CREDIT CARD", fontsize=20, fontname="helv", fontfile=None)
page1.insert_text((50, 100), "MOST IMPORTANT TERMS AND CONDITIONS (MITC)", fontsize=16)
page1.insert_text((50, 150), "Welcome to the world of Axis Atlas. Please read these terms carefully.")

# Page 2: Schedule of Charges (Annual Fee)
page2 = doc.new_page()
page2.insert_text((50, 50), "1. SCHEDULE OF CHARGES", fontsize=16)
page2.insert_text((50, 100), "a) Joining Fee: Rs. 5,000 + Taxes")
page2.insert_text((50, 130), "b) Annual Fee: Rs. 5,000 + Taxes")
page2.insert_text((50, 160), "The Annual Fee will be levied from the second year onwards.")
page2.insert_text((50, 190), "Renewal Fee waiver is not applicable for this card.")
page2.insert_text((50, 220), "c) Add-on Card Fee: Nil")

# Page 3: Lounge Access and Benefits
page3 = doc.new_page()
page3.insert_text((50, 50), "2. TRAVEL AND LOUNGE BENEFITS", fontsize=16)
page3.insert_text((50, 100), "Lounge Access:")
page3.insert_text((50, 130), "Primary cardholders are entitled to 8 complimentary domestic lounge visits")
page3.insert_text((50, 160), "per calendar year at select airports in India. Guests are not permitted.")
page3.insert_text((50, 190), "International Lounge: 4 complimentary Priority Pass visits per year.")

# Page 4: Reward Points
page4 = doc.new_page()
page4.insert_text((50, 50), "3. EDGE REWARD POINTS", fontsize=16)
page4.insert_text((50, 100), "Earn 2 EDGE Miles for every Rs. 100 spent across all categories.")
page4.insert_text((50, 130), "Earn 5 EDGE Miles for every Rs. 100 spent on Travel via Axis EDGE Portal.")
page4.insert_text((50, 160), "Reward points are capped at 10,000 per statement cycle.")

os.makedirs("backend/data/uploads", exist_ok=True)
doc.save("backend/data/uploads/real-test-mitc.pdf")
print("Generated real-test-mitc.pdf successfully.")
