from dateutil import parser
from datetime import datetime

def parse_shopify_datetime(dt_str: str) -> datetime | None:
    if not dt_str:
        return None
    return parser.isoparse(dt_str)
