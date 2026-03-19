from pathlib import Path


def test_docker_workflow_exists():
    project_root = Path(__file__).resolve().parents[1]
    workflow = project_root / ".github" / "workflows" / "docker-image.yml"
    assert workflow.exists(), "Docker build workflow is missing"
