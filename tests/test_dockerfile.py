from pathlib import Path


def test_dockerfile_exists():
    project_root = Path(__file__).resolve().parents[1]
    dockerfile = project_root / "Dockerfile"
    assert dockerfile.exists(), "Dockerfile is missing; required for Docker image build"
