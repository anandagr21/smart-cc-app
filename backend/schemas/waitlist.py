from pydantic import BaseModel, EmailStr

class WaitlistCreate(BaseModel):
    email: EmailStr

class WaitlistResponse(BaseModel):
    id: str
    email: str
    message: str
