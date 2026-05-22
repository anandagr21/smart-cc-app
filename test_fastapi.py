from pydantic import BaseModel, ConfigDict
from backend.transactions.schemas import EnrichedTransactionResponse
from backend.core.responses import PaginatedResponse

# we just want to import the models and see if there are any warnings or errors
print("Imports successful")
