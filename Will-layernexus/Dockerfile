FROM python:3.14-slim AS layernexus
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATABASE_PATH=/app/data/db.sqlite3
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc curl git \
    && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 https://github.com/peterus/LayerNexus.git /tmp/LayerNexus \
    && cp -a /tmp/LayerNexus/. /app/ && rm -rf /tmp/LayerNexus
RUN pip install --no-cache-dir -r requirements.txt gunicorn
RUN mkdir -p /app/media /app/data && chmod +x /app/entrypoint.sh
RUN DJANGO_SECRET_KEY=build-placeholder python manage.py collectstatic --noinput
RUN addgroup --system --gid 101 appgroup \
    && adduser --system --uid 100 --gid 101 appuser \
    && chown -R 100:101 /app/media /app/data /app/staticfiles
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
    CMD curl -f http://localhost:8000/health/ || exit 1
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "layernexus.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
