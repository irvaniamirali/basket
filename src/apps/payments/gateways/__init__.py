from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PaymentRequestResult:
    authority: str
    code: int
    message: str


@dataclass(frozen=True)
class PaymentVerificationResult:
    code: int
    message: str
    reference_id: str


class PaymentGateway(Protocol):
    def request_payment(self, *, amount_rials, description, order_id): ...

    def verify_payment(self, *, amount_rials, authority): ...

    def payment_url(self, authority): ...


def get_payment_gateway() -> PaymentGateway:
    from apps.payments.gateways.zarinpal import ZarinPalGateway

    return ZarinPalGateway()
