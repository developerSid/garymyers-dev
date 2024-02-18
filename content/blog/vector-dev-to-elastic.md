+++
title = "Connect Vector to Elastic"
date = 2024-02-18
+++

I'm going to add some additional detail to using [Vector.dev](https://vector.dev) to post events to Elastic's Logging Solution using Vector's [Elasticsearch](https://vector.dev/docs/reference/configuration/sinks/elasticsearch/) sink.

## Some History
We use [Elastic](https://www.elastic.co/) for our log aggregation.  I'm not exactly sure the reason and for the purposes of this blog post it doesn't really matter.  Only know that is what we use.  It was a decision made by some other part of the organization.  I don't even know if I would recommend anything other than Elastic because I haven't really looked into what is available in this problem space.  Basically I'm not an Elastic expert and I just do what I'm told.

## The Directive
Logstash uses a lot of memory, and we'd like something smaller.  I have exactly zero experience with Logstash other than knowing it exists as part of the ELK stack.  On the bright side I have some limited experience with Vector for sending JSON events to an S3 bucket.  Since I'm not in the mood to spend hours looking for anything else I decided to dive deeper into the depths of what Vector offers.

## The System
### Application details
The application doing the logging is a Java Application in this case using [logback](https://logback.qos.ch/) to write logging events to both stdout and a file.  The stdout messages are pretty basic in their format and are intended to be human-readable.  Both logback and vector configurations will be injected at runtime allowing for ops to handle how the logging actually works.

### Deployment
We're using Kubernetes to deploy and manage the application because that's what all the cool kids use and we want to be cool. Right?!  Anyway, when deployed into a customer facing environment the Logback configuration is controlled using [-Dlogback.configurationFile](https://logback.qos.ch/manual/configuration.html#configFileProperty) Java System property.

#### Logback
```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE configuration>
<configuration>
   <property name="LOG_FILE_HOME" value="/var/log/" />
   <property name="BASE_LOG_FILE_NAME" value="application"/>

   <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
      <encoder>
         <pattern>%-5level %d{HH:mm:ss.SSS} [%thread] %logger{36} - %msg%n</pattern>
      </encoder>
   </appender>

   <appender name="ROLLING" class="ch.qos.logback.core.rolling.RollingFileAppender">
      <file>${LOG_FILE_HOME}/${BASE_LOG_FILE_NAME}.log</file>
      <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
          <fileNamePattern>${LOG_FILE_HOME}/${BASE_LOG_FILE_NAME}.%d{yyyy-MM-dd}.%i.log</fileNamePattern>
          <maxFileSize>100MB</maxFileSize>
          <maxHistory>5</maxHistory>
          <totalSizeCap>600MB</totalSizeCap>
      </rollingPolicy>
      <encoder class="net.logstash.logback.encoder.LogstashEncoder" />
   </appender>

   <root level="trace">
      <appender-ref ref="STDOUT"/>
      <appender-ref ref="ROLLING"/>
   </root>
</configuration>
```

#### Deployment Descriptor
```yaml
kind: deployment
```


## Starting Point
I already had a basic working Vector TOML configuration for writing to an [S3 bucket](https://vector.dev/docs/reference/configuration/sinks/aws_s3/) as well as sending events to stdout. Which looked mostly like:
```toml
# Vector Configuration File
[api]
enabled = true

# Define sources
[sources.logstash_json_formatted_logfile]
type = "file"
include = [ "/var/log/applcation*.log" ]

[transforms.filter_levels]
type = "filter"
inputs = ["logback"]
condition = 'includes(["ERROR"], upcase!(parse_json!(string!(.message)).level))'

# Define sinks
[sinks.stdout]
type = "console"
inputs = [ "filter_levels" ]
encoding.charset = "UTF-8"
encoding.codec = "raw_message"

[sinks.s3_sink]
type = "aws_s3" # Use the AWS S3 sink
inputs = ["filter_levels"] # Send data from the json_source to this sink
bucket = "logging" # Replace with your S3 bucket name
region = "us-east-1" # Replace with your S3 bucket's region
compression = "none"
buffer.max_events = 100
buffer.type = "memory"
buffer.when_full = "block"
encoding.charset = "UTF-8"
encoding.codec = "raw_message"
filename_append_uuid = false
filename_extension = "log"
filename_time_format = "%Y-%m-%d_%H-%M-%S"
key_prefix = "application/"
```
### Thoughts
Take this example with limited authority other than it can be a starting place.   I wrote it using Localstack, so YMMV using real S3 in AWS.

`raw_message` turns out to not be what I wanted and as I copy pastaing my way through the first setup it took me a while to figure out why I wasn't getting all the data I thought I should be getting.  See [Vector S3 Sink Code](https://vector.dev/docs/reference/configuration/sinks/aws_s3/#encoding.codec) for why it might not be exactly what I wanted.  FYI [Consle Sink](https://vector.dev/docs/reference/configuration/sinks/console/#encoding.codec) works the same way.  (Spoilers: it only sends the `message` property of the event and nothing else).  This is my warning to you to be aware of what `raw_message` is actually doing.

## Getting a Key
Log into your Elastic system and generate a new token.  You'll probably want the same permissions that Logstash uses, but that will be different for everyone and this isn't really about setting up that token, more just getting it so you can use it.  Make sure you grab the Base64 encoded API Token when you have generated it.

## Final Implementation
After what amounted to an afternoon of failure I was able to figure out something that worked.  I had to rely on Elastic's [Security API Doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/security-api-create-api-key.html) with this gem triggering the eureka moment.

```bash
curl -H "Authorization: ApiKey VnVhQ2ZHY0JDZGJrUW0tZTVhT3g6dWkybHAyYXhUTm1zeWFrdzl0dk5udw==" \
http://localhost:9200/_cluster/health\?pretty
```

With that in my head I was finally able to configure `request.headers` with a header exactly like the curl call. Albeit using a valid API token.

```toml
# Vector Configuration File
[api]
enabled = true

# Define sources
[sources.logstash_json_formatted_logfile]
type = "file"
include = [ "/var/log/application.log" ]

[transforms.filter_logfile]
type = "filter"
inputs = ["logstash_json_formatted_logfile"]
condition = 'includes(["WARN", "ERROR"], parse_json!(string!(.message)).level)'

# Transform logstash JSON to something closer to what we want to see in the Elastic Dashboard
[transforms.elastic]
type = "remap"
inputs = ["filter_logfile"]
source = '''
o_host = .host
. = parse_json!(string!(.message))
.host = o_host
.host.architecture = get_env_var("MACHTYPE") ?? ""
.fields.env = "my-test"
.fields.app_id = get_env_var("APP_ID") ?? ""
.category = .logger_name
.thread = .thread_name
.agent.name = "vector"
.agent.type = "vector"
del(.level_value)
del(.@version)
del(.logger_name)
del(.thread_name)
'''

[sinks.stdout]
type = "console"
inputs = [ "elastic" ]
encoding.charset = "UTF-8"
encoding.codec = "json"

# elastic connection
[sinks.my_elastic_sink]
api_version = "v8"
type = "elasticsearch"
inputs = [ "enriched" ]
endpoints = [ "https://your.elastic.subdomain.elastic-cloud.com:1234" ]
bulk.action = "create"
buffer.max_events = 100
buffer.type = "memory"
mode = "data_stream"
data_stream.namespace = "default"
data_stream.type = "logs"
data_stream.dataset = "vector-my-test-ds"
encoding.timestamp_format = "rfc3339"
request.headers = { "Authorization" = "ApiKey VnVhQ2ZHY0JDZGJrUW0tZTVhT3g6dWkybHAyYXhUTm1zeWFrdzl0dk5udw==" }
```

Be sure to set up your `endpoints` property correctly with 1 or more elastic endpoints.  Make sure the port you use is correct since it will most likely not be 1234.  Also ApiKey `VnVhQ2ZHY0JDZGJrUW0tZTVhT3g6dWkybHAyYXhUTm1zeWFrdzl0dk5udw==` is from the Elastic documentation and probably won't actually do anything ;).

## Parting Thoughts
Vector is a great tool. It is small enough to be deployed as a simple sidecar in your application pod, and fast enough to be deployed as a DaemonSet to process all the logs generated by all the pods on each node. It is flexible enough and appears to have enough community involvement that you can use it to send logging events to Elastic.  The docs are pretty good once you get used to them.  I do wish the docs had some deeper real world examples.  I'll have to go see if they would take a PR for the documentation with a fullblown Elastic example because non of the exmples on the Elasticsearch sink were good enough to get going.

## Notes
* hosts and ports were changed to protect the innocent
* ApiKey's where changed to protect me!
