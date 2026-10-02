import json
import ssl
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from django.conf import settings

from apps.payments.gateways import PaymentRequestResult, PaymentVerificationResult


class ZarinPalGatewayError(Exception):
    def __init__(self, message, *, code=None, kind="provider"):
        super().__init__(message)
        self.code = code
        self.kind = kind


class ZarinPalGateway:
    def __init__(self):
        self.base_url = settings.ZARINPAL_BASE_URL.rstrip("/")
        self.merchant_id = settings.ZARINPAL_MERCHANT_ID
        self.callback_url = settings.ZARINPAL_CALLBACK_URL
        self.timeout = settings.ZARINPAL_TIMEOUT

    def request_payment(self, *, amount_rials, description, order_id):
        if not self.merchant_id:
            raise ZarinPalGatewayError(
                "ZarinPal merchant ID is not configured.", kind="configuration"
            )
        if not self.callback_url:
            raise ZarinPalGatewayError(
                "ZarinPal callback URL is not configured.", kind="configuration"
            )

        payload = {
            "merchant_id": self.merchant_id,
            "amount": amount_rials,
            "currency": "IRR",
            "description": description,
            "callback_url": self.callback_url,
            "metadata": {"order_id": str(order_id)},
        }
        data = self._post_json("/pg/v4/payment/request.json", payload)
        code = self._provider_code(data)
        message = self._provider_message(data)
        authority = data.get("authority")
        if code != 100 or not isinstance(authority, str) or not authority:
            raise ZarinPalGatewayError(message, code=code)
        return PaymentRequestResult(authority=authority, code=code, message=message)

    def verify_payment(self, *, amount_rials, authority):
        if not self.merchant_id:
            raise ZarinPalGatewayError(
                "ZarinPal merchant ID is not configured.", kind="configuration"
            )

        data = self._post_json(
            "/pg/v4/payment/verify.json",
            {
                "merchant_id": self.merchant_id,
                "amount": amount_rials,
                "authority": authority,
            },
        )
        code = self._provider_code(data)
        reference_id = data.get("ref_id", "")
        if reference_id is not None and not isinstance(reference_id, (int, str)):
            raise ZarinPalGatewayError("Invalid ZarinPal verification response.")
        return PaymentVerificationResult(
            code=code,
            message=self._provider_message(data),
            reference_id=str(reference_id) if reference_id is not None else "",
        )

    def payment_url(self, authority):
        return f"{self.base_url}/pg/StartPay/{quote(authority, safe='')}"

    def _post_json(self, path, payload):
        request = Request(
            f"{self.base_url}{path}",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(
                request,
                timeout=self.timeout,
                context=ssl.create_default_context(),
            ) as response:
                body = response.read()
        except HTTPError as exc:
            raise ZarinPalGatewayError(
                f"ZarinPal returned HTTP {exc.code}.", code=exc.code, kind="http"
            ) from exc
        except (URLError, TimeoutError, OSError) as exc:
            raise ZarinPalGatewayError(
                "Could not connect to ZarinPal.", kind="network"
            ) from exc

        try:
            response_data = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ZarinPalGatewayError(
                "ZarinPal returned an invalid JSON response.", kind="response"
            ) from exc

        if not isinstance(response_data, dict) or not isinstance(
            response_data.get("data"), dict
        ):
            raise ZarinPalGatewayError(
                "ZarinPal returned an invalid response.", kind="response"
            )
        return response_data["data"]

    @staticmethod
    def _provider_code(data):
        code = data.get("code")
        if not isinstance(code, int):
            raise ZarinPalGatewayError(
                "ZarinPal returned an invalid response code.", kind="response"
            )
        return code

    @staticmethod
    def _provider_message(data):
        message = data.get("message", "")
        return message[:255] if isinstance(message, str) else ""
