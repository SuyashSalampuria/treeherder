import datetime
import logging
import time

from rest_framework import generics
from treeherder.model import models

from .infra_serializers import InfraCompareSerializer, InfraCompareQuerySerializers

from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class InfraCompareView(generics.ListAPIView):
    serializer_class = InfraCompareSerializer
    queryset = None

    def list(self, request):
        query_params = InfraCompareQuerySerializers(data=request.query_params)
        if not query_params.is_valid():
            return Response(data=query_params.errors, status=HTTP_400_BAD_REQUEST)

        startday = query_params.validated_data['startday']
        endday = query_params.validated_data['endday']
        project = query_params.validated_data['project']
        revision = query_params.validated_data['revision']
        interval = query_params.validated_data['interval']
        repository = models.Repository.objects.get(name=project)

        if revision:
            push = models.Push.objects.filter(repository=repository, revision=revision).first()
            jobs = models.Job.objects.filter(push=push)
        elif interval and not startday and not endday:
            # time.time() and interval are in seconds here
            jobs = models.Job.objects.filter(
                repository=repository,
                start_time__gt=datetime.datetime.utcfromtimestamp(int(time.time() - int(interval))),
            )
        else:
            jobs = models.Job.objects.filter(
                repository=repository, start_time__gt=startday, start_time__lt=endday
            )
        self.queryset = []
        for job in jobs:
            query_obj = dict(
                id=job.id,
                duration=(job.end_time - job.start_time).total_seconds(),
                job_name=job.job_type.name,
                result=job.result,
            )
            self.queryset.append(query_obj)
        serializer = self.get_serializer(self.queryset, many=True)
        return Response(data=serializer.data)
