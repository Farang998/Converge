from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import json
from urllib import request as urlrequest
from urllib.error import URLError, HTTPError
import urllib


@api_view(['GET'])
def hello_world(request):
    return Response({"message": "Hello, world!"})


@api_view(['POST'])
def ai_query(request):

    try:
        payload = {
            'project_id': request.data.get('project_id'),
            'query': request.data.get('query') or 'initialize the conversation with basic instructions',
            'top_k': int(10),
        }

        req = urlrequest.Request(
            url='http://localhost:5000/query',
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        with urlrequest.urlopen(req, timeout=30) as resp:
            resp_body = resp.read().decode('utf-8')
            data = json.loads(resp_body) if resp_body else {}
            return Response(data, status=resp.getcode())

    except HTTPError as e:
        try:
            err_body = e.read().decode('utf-8')
            err_json = json.loads(err_body)
        except Exception:
            err_json = {'error': str(e)}
        return Response(err_json, status=e.code)
    except URLError as e:
        return Response({'error': f'AI service unreachable: {e.reason}'}, status=status.HTTP_502_BAD_GATEWAY)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def ingest_proxy(request):
    """Proxy an ingest request to the ingestion service running on port 5000.

    Expects JSON body with at least `s3_uris` (list) and optional `project_id`.
    """
    try:
        payload = request.data or {}

        req = urlrequest.Request(
            url='http://localhost:5000/ingest',
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        with urlrequest.urlopen(req, timeout=60) as resp:
            resp_body = resp.read().decode('utf-8')
            data = json.loads(resp_body) if resp_body else {}
            return Response(data, status=resp.getcode())

    except HTTPError as e:
        try:
            err_body = e.read().decode('utf-8')
            err_json = json.loads(err_body)
        except Exception:
            err_json = {'error': str(e)}
        return Response(err_json, status=e.code)
    except URLError as e:
        return Response({'error': f'Ingest service unreachable: {e.reason}'}, status=status.HTTP_502_BAD_GATEWAY)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)