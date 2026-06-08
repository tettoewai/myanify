FROM typesense/typesense:27.0

USER root
RUN apt-get update && apt-get install -y curl tar gzip
RUN mkdir -p /data && chown typesense:typesense /data

USER typesense

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]