variable "name" {
  type = string
}

variable "type" {
  type = string
  default = "String"
}

variable "value" {
  type = string
}

variable "tags" {
  type = map(string)
  default = {}
}

variable "aws_region" {
  type = string
}