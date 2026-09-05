import csv
import io

def generate_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Sender", "Subject", "Status", "Risk Score"])
    writer.writerow(["1", "test@test.com", "Test", "SAFE", 10.0])
    return output.getvalue()

print(generate_csv())
