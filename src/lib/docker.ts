import Dockerode from 'dockerode';

const docker = new Dockerode();

export async function listContainers() {
  const containers = await docker.listContainers({ all: true });

  return containers.map((c) => ({
    id: c.Id,
    name: (c.Names[0] || '').replace(/^\//, ''),
    image: c.Image,
    state: c.State,
    status: c.Status,
    ports: c.Ports.map((p) =>
      p.PublicPort
        ? `${p.PublicPort}:${p.PrivatePort}/${p.Type}`
        : `${p.PrivatePort}/${p.Type}`,
    ).filter((v, i, a) => a.indexOf(v) === i),
  }));
}

export async function getContainerLogs(id: string, tail = 100): Promise<string> {
  const container = docker.getContainer(id);
  const logBuffer = await container.logs({
    stdout: true,
    stderr: true,
    tail,
    timestamps: true,
  });

  const buffer = Buffer.isBuffer(logBuffer)
    ? logBuffer
    : Buffer.from(logBuffer as string, 'binary');

  let logs = '';
  let offset = 0;

  while (offset + 8 <= buffer.length) {
    const payloadSize = buffer.readUInt32BE(offset + 4);
    if (offset + 8 + payloadSize > buffer.length) break;
    const payload = buffer.slice(offset + 8, offset + 8 + payloadSize);
    logs += payload.toString('utf-8');
    offset += 8 + payloadSize;
  }

  if (!logs && buffer.length > 0) {
    logs = buffer.toString('utf-8');
  }

  return logs;
}

export async function restartContainer(id: string): Promise<void> {
  const container = docker.getContainer(id);
  await container.restart();
}
